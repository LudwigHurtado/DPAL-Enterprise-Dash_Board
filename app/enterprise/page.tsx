import Link from "next/link";

import MasterEnterpriseDashboard from "@/pages/MasterEnterpriseDashboard";

export const metadata = {
  title: "DPAL Enterprise HQ",
  description: "Central oversight for Nexus, Reports, Ledger, and monitoring services.",
};

export default function EnterprisePage() {
  return (
    <>
      <MasterEnterpriseDashboard />
      <Link
        href="/media-studio"
        className="fixed bottom-5 right-5 z-[1200] rounded-full border border-emerald-200/25 bg-emerald-950 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-800"
        title="Open DPAL Evidence Studio"
      >
        🎬 Evidence Studio
      </Link>
    </>
  );
}
