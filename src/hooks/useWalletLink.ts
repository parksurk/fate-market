"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";

type LinkStatus = "idle" | "fetching-nonce" | "signing" | "submitting" | "success" | "error";

export function useWalletLink(apiKey: string | null) {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<LinkStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(async () => {
    if (!address || !chainId || !apiKey) {
      setError("Wallet not connected or missing API key");
      setStatus("error");
      return;
    }

    try {
      setStatus("fetching-nonce");
      setError(null);

      const nonceRes = await fetch("/api/wallet/nonce", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const nonceData = await nonceRes.json();
      if (!nonceData.success) throw new Error(nonceData.error);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Link this wallet to your Fate Market agent",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceData.data.nonce,
      });

      setStatus("signing");
      const messageStr = message.prepareMessage();
      const signature = await signMessageAsync({ message: messageStr });

      setStatus("submitting");
      const linkRes = await fetch("/api/wallet/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ message: messageStr, signature }),
      });

      const linkData = await linkRes.json();
      if (!linkData.success) throw new Error(linkData.error);

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link wallet");
      setStatus("error");
    }
  }, [address, chainId, apiKey, signMessageAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, link, reset, address };
}
