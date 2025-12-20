import type { Metadata } from "next";
import Link from "next/link";
import { countDiseaseElementAnswers } from "@/lib/disease-elements";

type MetricProps = { title: string; value: string; href?: string };

export const metadata: Metadata = {
  title: "AFib Dashboard | Overview",
  description: "Live AFib community dashboards across triggers, symptoms, and supplements.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [totalVotes, triggerVotes, symptomVotes, supplementVotes] = await Promise.all([
    countDiseaseElementAnswers(),
    countDiseaseElementAnswers(1),
    countDiseaseElementAnswers(2),
    countDiseaseElementAnswers(3),
  ]);

  const metrics: MetricProps[] = [
    { title: "Total Votes", value: formatNumber(totalVotes) },
    { title: "Triggers Votes", value: formatNumber(triggerVotes), href: "/triggers" },
    { title: "Symptoms Votes", value: formatNumber(symptomVotes), href: "/symptoms" },
    { title: "Supplements Votes", value: formatNumber(supplementVotes), href: "/supplements" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Accumulated statistics across triggers, symptoms, and supplements.
            </p>
          </div>
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">Live</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <Metric key={metric.title} {...metric} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, href }: MetricProps) {
  const baseClasses = "rounded-xl border border-slate-200 bg-white px-4 py-3 transition";

  const linkClasses = `${baseClasses} group relative pr-11 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm active:translate-y-0 active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white`;
  const staticClasses = `${baseClasses} hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm`;

  const content = (
    <>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {href && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-emerald-50 group-hover:text-emerald-700 group-active:bg-emerald-50 group-active:text-emerald-700"
        >
          ›
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={linkClasses}>
        {content}
      </Link>
    );
  }

  return <div className={staticClasses}>{content}</div>;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}
