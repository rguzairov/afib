import { AISummarySectionServer } from "@/components/features/clinical-picture/ai-summary";
import {
  ClinicalPictureTabs,
  ClinicalPictureTabPanel,
  type ClinicalPictureTabKey,
} from "@/components/features/clinical-picture/clinical-picture-tabs";
import { ClinicalPictureShareForm } from "@/components/features/clinical-picture/share-form";
import { ClinicalPictureTimelineServer } from "@/components/features/clinical-picture/timeline";
import type { TabsItem } from "@/components/ui/tabs";

export const headerCopy = {
  title: "Clinical picture",
  description: "Anonymized stories from people who report a confirmed AFib diagnosis.",
  badgePrimary: "Kindly share only if diagnosed",
  badgeSecondary: "Self-reported",
};

export const clinicalPictureMetaDescription = headerCopy.description;

const tabs: Array<TabsItem<ClinicalPictureTabKey>> = [
  { value: "summary", label: "AI Summary" },
  { value: "share", label: "Share" },
  { value: "timeline", label: "Latest Shares" },
];

export default function ClinicalPicturePage() {
  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">{headerCopy.title}</h1>
          <p className="text-sm text-slate-500">{headerCopy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
            {headerCopy.badgePrimary}
          </span>
          <span className="text-slate-500">{headerCopy.badgeSecondary}</span>
        </div>
      </header>

      <ClinicalPictureTabs tabs={tabs} aria-label="Clinical picture tabs">
        <ClinicalPictureTabPanel value="summary">
          <AISummarySectionServer />
        </ClinicalPictureTabPanel>
        <ClinicalPictureTabPanel value="share">
          <ClinicalPictureShareForm />
        </ClinicalPictureTabPanel>
        <ClinicalPictureTabPanel value="timeline">
          <ClinicalPictureTimelineServer />
        </ClinicalPictureTabPanel>
      </ClinicalPictureTabs>
    </div>
  );
}
