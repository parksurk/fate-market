"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWalletButton() {
  return (
    <ConnectButton
      chainStatus="icon"
      accountStatus="avatar"
      showBalance={false}
    />
  );
}
