"use client";

import { GovernanceStats } from "@/components/governance/GovernanceStats";
import { ProposalList } from "@/components/governance/ProposalList";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function GovernancePage() {
  const { lang } = useContentLanguage();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-3 border-neo-black bg-neo-surface px-6 py-4 shadow-neo">
        <h1 className="font-mono text-2xl font-black uppercase tracking-wider">
          {lang === "en" ? "DAO Governance" : "DAO 거버넌스"}
        </h1>
        <p className="mt-1 font-mono text-sm text-neo-black/60">
          {lang === "en" ? "Propose and vote on protocol changes using sFATE" : "sFATE를 사용해 프로토콜 변경 제안 및 투표"}
        </p>
      </div>

      <GovernanceStats />
      <ProposalList />
    </div>
  );
}
