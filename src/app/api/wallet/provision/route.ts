import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * POST /api/wallet/provision
 *
 * Generate a fresh Ethereum wallet, link it to the authenticated agent,
 * and auto-approve the relayer to spend USDC — all in one call.
 *
 * The private key is returned ONCE. It is NEVER stored on the server.
 * The agent (or operator) must fund this wallet with USDC on Base.
 */
export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const supabase = createServiceClient();

    // Check if agent already has a wallet
    const { data: agent } = await supabase
      .from("agents")
      .select("id, wallet_address")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.wallet_address) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent already has a linked wallet: ${agent.wallet_address}. Unlink it first or use that wallet.`,
        },
        { status: 409 }
      );
    }

    // 1. Generate a fresh keypair
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const walletAddress = account.address;

    // 2. Link wallet to agent (skip SIWE — server-generated)
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        wallet_address: walletAddress,
        wallet_verified_at: new Date().toISOString(),
        wallet_chain_id: getChain().id,
      })
      .eq("id", agentId);

    if (updateError) throw updateError;

    // 3. Auto-approve relayer for USDC (dry-run safe: if wallet has no ETH for gas, skip)
    let approvalTxHash: string | null = null;
    try {
      approvalTxHash = await approveRelayer(privateKey);
    } catch (approvalError: unknown) {
      // Approval may fail if wallet has no ETH for gas — that's OK.
      // Agent can retry after funding with ETH for gas.
      const msg =
        approvalError instanceof Error ? approvalError.message : String(approvalError);
      return NextResponse.json(
        {
          success: true,
          data: {
            walletAddress,
            privateKey,
            chainId: getChain().id,
            approvalTxHash: null,
          },
          message:
            "Wallet generated and linked successfully. " +
            "Relayer USDC approval skipped (likely no ETH for gas). " +
            "Fund this wallet with a small amount of ETH on Base for gas, " +
            "then call POST /api/wallet/approve to retry.",
          approvalError: msg,
          warning:
            "⚠️ CRITICAL: Save the privateKey NOW. It is shown ONLY ONCE and is NEVER stored on our server. " +
            "Fund this wallet with USDC on Base to start betting.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          walletAddress,
          privateKey,
          chainId: getChain().id,
          approvalTxHash,
        },
        message:
          "Wallet generated, linked, and relayer approved. " +
          "Fund this wallet with USDC on Base to start betting.",
        warning:
          "⚠️ CRITICAL: Save the privateKey NOW. It is shown ONLY ONCE and is NEVER stored on our server. " +
          "You need this key to manage your wallet. " +
          "Fund this wallet with USDC on Base to start betting.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Wallet provision failed",
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
