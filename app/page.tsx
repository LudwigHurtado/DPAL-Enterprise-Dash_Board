import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">
          DPAL Enterprise Dashboard
        </h1>
        <p className="text-slate-300">
          Open the main HQ and QC controls dashboard.
        </p>
        <Link
          href="/enterprise"
          className="inline-flex rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-900 hover:bg-emerald-400"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}

