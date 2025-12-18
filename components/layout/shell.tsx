"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HeartActivityIcon } from "@/components/ui/heart-activity-icon";
import { cn } from "@/components/ui/utils";

type NavNode = {
  label: string;
  href: string;
  icon: string;
  hidden?: boolean;
};

const navTree: NavNode[] = [
  { label: "Dashboard", href: "/", icon: "speedometer2" },
  { label: "Clinical Picture", href: "/clinical-picture", icon: "images" },
  { label: "Triggers", href: "/triggers", icon: "lightning-charge" },
  { label: "Symptoms", href: "/symptoms", icon: "heart-pulse" },
  { label: "Supplements", href: "/supplements", icon: "droplet-half" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const tree = navTree.filter((node) => !node.hidden).map((node) => (
    <TreeNode key={node.href} node={node} depth={0} isActive={isActive} open={open} />
  ));

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-emerald-950/25 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-all duration-200 ease-in-out md:static md:z-auto md:h-auto md:border-r md:bg-white/95 md:px-0 md:shadow-none",
          open
            ? "w-64 translate-x-0 shadow-lg md:w-64"
            : "w-0 -translate-x-full overflow-hidden md:w-16 md:translate-x-0 md:overflow-visible"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
                <HeartActivityIcon className="h-4 w-4" />
              </div>
              {open && (
                <div className="leading-tight">
                  <p className="text-sm font-semibold tracking-tight text-slate-900">AFib</p>
                  <p className="text-xs text-slate-500">Anonymous Public Data</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            >
              {open ? "⟨" : "⟩"}
            </button>
          </div>

          <div className="px-2">
            <div className="space-y-1">{tree}</div>
          </div>

          <div className="mt-auto px-4 py-4">
            {open ? (
              <p className="text-xs text-slate-500">AFib triggers, symptoms, supplements</p>
            ) : (
              <span className="text-xs text-slate-400">ⓘ</span>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-4 p-2 sm:p-4 md:p-6 lg:p-8">
        <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mr-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label={open ? "Hide sidebar" : "Show sidebar"}
            >
              ☰
            </button>
            <Link href="/" className="flex items-center gap-3 rounded-md px-1 py-1 transition hover:bg-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
                <HeartActivityIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Atrial Fibrillation</p>
                <p className="text-xs text-slate-500">Share Your Experience Anonymously</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white/95 px-2 py-4 shadow-sm backdrop-blur sm:px-4 sm:py-5 md:px-8">
          <div className="mx-auto w-full max-w-5xl min-w-0">{children}</div>
        </main>
        <footer className="rounded-xl border border-slate-200 bg-white/90 px-6 py-4 text-xs text-slate-500 shadow-sm">
          This community project shares informational insights only and is not medical advice. Use shared experiences to
          understand your own patterns, but always work with a licensed clinician for diagnoses or treatment decisions.
        </footer>
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  isActive,
  open,
}: {
  node: NavNode;
  depth: number;
  isActive: (href: string) => boolean;
  open: boolean;
}) {
  const active = isActive(node.href);
  const padding = open ? depth * 14 : 0;

  return (
    <div>
      <Link
        href={node.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
          active ? "bg-emerald-700 text-white shadow-sm" : "hover:bg-slate-100",
          open ? "justify-start" : "justify-center"
        )}
        style={{ paddingLeft: open ? `${padding + 10}px` : undefined }}
      >
        <span className={cn("text-base leading-none", active ? "text-white" : "text-slate-500")}>
          <i className={cn("bi", `bi-${node.icon}`)} aria-hidden="true" />
        </span>
        {open && <span className={cn("truncate", active ? "text-white" : "text-slate-800")}>{node.label}</span>}
      </Link>
    </div>
  );
}
