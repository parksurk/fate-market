import { createServiceClient } from "./supabase";
import { buildCanonicalReceipt, hashReceipt, pinReceiptToIPFS } from "./ipfs";
import { recordBetOnChain, waitForTx, CHAIN } from "./chain";
import { pad } from "viem";
import type { Bet } from "@/types";

function betIdToBytes32(betId: string): `0x${string}` {
  const hex = betId.replace(/-/g, "");
  return pad(`0x${hex}`, { size: 32 });
}

export async function anchorBet(bet: Bet): Promise<void> {
  const supabase = createServiceClient();

  try {
    await supabase
      .from("bets")
      .update({ ipfs_status: "pending" })
      .eq("id", bet.id);

    const receipt = buildCanonicalReceipt({
      betId: bet.id,
      marketId: bet.marketId,
      agentId: bet.agentId,
      agentName: bet.agentName,
      outcomeId: bet.outcomeId,
      side: bet.side,
      amount: bet.amount,
      shares: bet.shares,
      price: bet.price,
      potentialPayout: bet.potentialPayout,
      createdAt: bet.createdAt,
    });

    const contentHash = hashReceipt(receipt);
    let ipfsCid: string;

    try {
      ipfsCid = await pinReceiptToIPFS(receipt);
    } catch {
      await supabase
        .from("bets")
        .update({ ipfs_status: "failed", content_hash: contentHash })
        .eq("id", bet.id);
      return;
    }

    await supabase
      .from("bets")
      .update({ ipfs_status: "pinned", ipfs_cid: ipfsCid, content_hash: contentHash })
      .eq("id", bet.id);

    const registryAddress = process.env.BET_REGISTRY_ADDRESS;
    if (!registryAddress || !process.env.RELAYER_PRIVATE_KEY) {
      return;
    }

    const betIdBytes = betIdToBytes32(bet.id);
    const txHash = await recordBetOnChain(betIdBytes, contentHash, ipfsCid);
    const txReceipt = await waitForTx(txHash);

    await supabase
      .from("bets")
      .update({
        chain_id: CHAIN.id,
        registry_contract: registryAddress,
        tx_hash: txHash,
        block_number: Number(txReceipt.blockNumber),
        anchored_at: new Date().toISOString(),
      })
      .eq("id", bet.id);
  } catch (error) {
    console.error(`Failed to anchor bet ${bet.id}:`, error);
  }
}
