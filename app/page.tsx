import Link from "next/link";

const DESTINATIONS = [
  {
    href: "/enterprise",
    eyebrow: "Operations",
    title: "Enterprise HQ",
    description: "Open the reports, workflow, evidence, health, and administration command center.",
    action: "Open dashboard",
  },
  {
    href: "/media-studio",
    eyebrow: "Evidence communications",
    title: "Evidence Studio",
    description:
      "Create governed video drafts and issue hashed production records through DPAL's protected private renderer.",
    action: "Open Evidence Studio",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-50 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
            DPAL Enterprise
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            Command, verify, and communicate.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
            Enter the operational dashboard or create a controlled, human-reviewed media draft with a server-verified production record.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/[0.07]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {destination.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">{destination.title}</h2>
              <p className="mt-3 min-h-14 text-sm leading-6 text-slate-300">
                {destination.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-300">
                {destination.action}{" "}
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
