"use client";

import { GovernanceStats } from "@/components/governance/GovernanceStats";
import { ProposalList } from "@/components/governance/ProposalList";

export default function GovernancePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-3 border-neo-black bg-neo-surface px-6 py-4 shadow-neo">
        <h1 className="font-mono text-2xl font-black uppercase tracking-wider">
          DAO Governance
        </h1>
        <p className="mt-1 font-mono text-sm text-neo-black/60">
          Propose and vote on protocol changes using sFATE
        </p>
      </div>

      <GovernanceStats />
      <ProposalList />
    </div>
  );
}
