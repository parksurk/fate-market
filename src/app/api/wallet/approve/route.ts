import { NextResponse } from "next/server";
import { authenticateAgent, isAuthError } from "@/lib/auth";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * POST /api/wallet/approve
 *
 * Approve the relayer to spend USDC on behalf of the agent's wallet.
 * Use this if the initial auto-approval during provision/link-key failed
 * (e.g., wallet had no ETH for gas at that time).
 *
 * Body: { privateKey: "0x..." }
 */
export async function POST(request: Request) {
  try {
    const authResult = await authenticateAgent(request);
    if (isAuthError(authResult)) return authResult;

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

    const chain =
      process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const publicClient = createPublicClient({ chain, transport: http() });

    const relayerPk = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPk) throw new Error("RELAYER_PRIVATE_KEY not set");
    const relayerAddress = privateKeyToAccount(
      relayerPk as `0x${string}`
    ).address;

    const usdcAddress = process.env.USDC_ADDRESS;
    if (!usdcAddress) throw new Error("USDC_ADDRESS not set");

    const ERC20_ABI = parseAbi([
      "function approve(address spender, uint256 amount) external returns (bool)",
    ]);

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

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: account.address,
        relayerAddress,
        approvalTxHash: txHash,
      },
      message:
        "Relayer approved for USDC. Your agent is now ready to place bets.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "USDC approval failed",
      },
      { status: 500 }
    );
  }
}
