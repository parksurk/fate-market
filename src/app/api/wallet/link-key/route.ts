import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * POST /api/wallet/link-key
 *
 * Link an existing wallet to the authenticated agent by providing
 * the wallet's private key. The server:
 *   1. Derives the wallet address
 *   2. Links it to the agent (bypasses SIWE)
 *   3. Auto-approves the relayer for USDC spending
 *
 * The private key is used IN-MEMORY ONLY and is NEVER stored.
 *
 * Body: { privateKey: "0x..." }
 */
export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const body = await request.json();
    const { privateKey } = body as { privateKey?: string };

    if (!privateKey || !privateKey.startsWith("0x") || privateKey.length !== 66) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid privateKey. Must be a 66-character hex string starting with '0x'.",
        },
        { status: 400 }
      );
    }

    // Derive wallet address from private key
    let walletAddress: string;
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      walletAddress = account.address;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid private key — could not derive address." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if wallet is already linked to another agent
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("wallet_address", walletAddress)
      .neq("id", agentId)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { success: false, error: "This wallet is already linked to another agent." },
        { status: 409 }
      );
    }

    // Link wallet to agent (bypass SIWE)
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        wallet_address: walletAddress,
        wallet_verified_at: new Date().toISOString(),
        wallet_chain_id: getChain().id,
      })
      .eq("id", agentId);

    if (updateError) throw updateError;

    // Auto-approve relayer for USDC
    let approvalTxHash: string | null = null;
    try {
      approvalTxHash = await approveRelayer(privateKey as `0x${string}`);
    } catch (approvalError: unknown) {
      const msg =
        approvalError instanceof Error ? approvalError.message : String(approvalError);
      return NextResponse.json(
        {
          success: true,
          data: {
            walletAddress,
            chainId: getChain().id,
            approvalTxHash: null,
          },
          message:
            "Wallet linked successfully. " +
            "Relayer USDC approval skipped (likely no ETH for gas). " +
            "Ensure this wallet has a small amount of ETH on Base for gas, " +
            "then call POST /api/wallet/approve to retry.",
          approvalError: msg,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        walletAddress,
        chainId: getChain().id,
        approvalTxHash,
      },
      message:
        "Wallet linked and relayer approved for USDC. " +
        "Your agent is ready to bet. Ensure the wallet has USDC on Base.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Wallet link failed",
      },
      { status: 500 }
    );
  }
}

// --- Helpers ---

function getChain() {
  return process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;
}

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

async function approveRelayer(agentPrivateKey: `0x${string}`): Promise<string> {
  const chain = getChain();
  const account = privateKeyToAccount(agentPrivateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({ chain, transport: http() });

  const relayerPk = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerPk) throw new Error("RELAYER_PRIVATE_KEY not set");
  const relayerAddress = privateKeyToAccount(relayerPk as `0x${string}`).address;

  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) throw new Error("USDC_ADDRESS not set");

  const maxUint256 = BigInt(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  );

  const txHash = await walletClient.writeContract({
    address: usdcAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [relayerAddress, maxUint256],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
