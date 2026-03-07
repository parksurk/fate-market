import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  formatUnits,
} from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * POST /api/wallet/withdraw
 *
 * Transfer USDC from the agent's wallet to any destination address.
 * This allows the human operator to withdraw winnings or leftover USDC
 * from the agent's wallet back to their personal wallet.
 *
 * The private key is used IN-MEMORY ONLY and is NEVER stored.
 *
 * Body: {
 *   privateKey: "0x...",        // Agent wallet private key
 *   to: "0x...",                // Destination address
 *   amount?: number             // USDC amount (human-readable, e.g. 100 = 100 USDC). Omit to withdraw ALL.
 * }
 */
export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

    const { agentId } = authResult;
    const body = await request.json();
    const { privateKey, to, amount } = body as {
      privateKey?: string;
      to?: string;
      amount?: number;
    };

    // --- Validate inputs ---

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

    if (!to || !isAddress(to)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid 'to' address. Must be a valid Ethereum address (0x...).",
        },
        { status: 400 }
      );
    }

    if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid amount. Must be a positive number (USDC, e.g. 100 = 100 USDC). Omit to withdraw all.",
        },
        { status: 400 }
      );
    }

    // --- Derive wallet & verify ownership ---

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletAddress = account.address;

    // Verify this wallet belongs to the authenticated agent
    const supabase = createServiceClient();
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

    if (
      !agent.wallet_address ||
      agent.wallet_address.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Private key does not match the agent's linked wallet. " +
            `Expected wallet: ${agent.wallet_address ?? "(none)"}. ` +
            `Derived wallet: ${walletAddress}.`,
        },
        { status: 403 }
      );
    }

    // --- Check USDC balance ---

    const chain =
      process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

    const usdcAddress = process.env.USDC_ADDRESS;
    if (!usdcAddress) throw new Error("USDC_ADDRESS not set");

    const ERC20_ABI = parseAbi([
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
    ]);

    const publicClient = createPublicClient({ chain, transport: http() });

    const balance = await publicClient.readContract({
      address: usdcAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    const balanceBigInt = balance as bigint;

    if (balanceBigInt === BigInt(0)) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent wallet has 0 USDC. Nothing to withdraw.`,
        },
        { status: 400 }
      );
    }

    // Calculate transfer amount (USDC has 6 decimals)
    const USDC_DECIMALS = 6;
    const transferAmount =
      amount !== undefined
        ? BigInt(Math.round(amount * 10 ** USDC_DECIMALS))
        : balanceBigInt; // withdraw all

    if (transferAmount > balanceBigInt) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Insufficient USDC balance. ` +
            `Requested: ${formatUnits(transferAmount, USDC_DECIMALS)} USDC. ` +
            `Available: ${formatUnits(balanceBigInt, USDC_DECIMALS)} USDC.`,
        },
        { status: 400 }
      );
    }

    // --- Execute transfer ---

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const txHash = await walletClient.writeContract({
      address: usdcAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to as `0x${string}`, transferAmount],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Read remaining balance
    const remainingBalance = await publicClient.readContract({
      address: usdcAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    const transferredFormatted = formatUnits(transferAmount, USDC_DECIMALS);
    const remainingFormatted = formatUnits(
      remainingBalance as bigint,
      USDC_DECIMALS
    );

    return NextResponse.json({
      success: true,
      data: {
        txHash,
        from: walletAddress,
        to,
        amount: transferredFormatted,
        remainingBalance: remainingFormatted,
        chainId: chain.id,
      },
      message:
        `Successfully transferred ${transferredFormatted} USDC to ${to}. ` +
        `Remaining balance: ${remainingFormatted} USDC. ` +
        `Tx: ${txHash}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "USDC withdrawal failed",
      },
      { status: 500 }
    );
  }
}
