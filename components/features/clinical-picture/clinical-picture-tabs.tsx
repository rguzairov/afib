"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useId, useState } from "react";
import { TabList, type TabsItem } from "@/components/ui/tabs";

export type ClinicalPictureTabKey = "summary" | "share" | "timeline";

type TabsContextValue = {
  idBase: string;
  value: ClinicalPictureTabKey;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export type ClinicalPictureTabsProps = {
  tabs: Array<TabsItem<ClinicalPictureTabKey>>;
  defaultValue?: ClinicalPictureTabKey;
  "aria-label"?: string;
  children: ReactNode;
};

export function ClinicalPictureTabs({
  tabs,
  defaultValue = "summary",
  children,
  "aria-label": ariaLabel,
}: ClinicalPictureTabsProps) {
  const [value, setValue] = useState<ClinicalPictureTabKey>(defaultValue);
  const idBase = `clinical-picture-${useId().replace(/:/g, "")}`;

  return (
    <TabsContext.Provider value={{ idBase, value }}>
      <TabList
        idBase={idBase}
        value={value}
        onValueChange={setValue}
        tabs={tabs}
        aria-label={ariaLabel}
      />
      {children}
    </TabsContext.Provider>
  );
}

export type ClinicalPictureTabPanelProps = {
  value: ClinicalPictureTabKey;
  children: ReactNode;
};

export function ClinicalPictureTabPanel({ value, children }: ClinicalPictureTabPanelProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("ClinicalPictureTabPanel must be used within <ClinicalPictureTabs>.");
  }

  const active = ctx.value === value;

  return (
    <div
      role="tabpanel"
      id={`${ctx.idBase}-panel-${value}`}
      aria-labelledby={`${ctx.idBase}-tab-${value}`}
      tabIndex={active ? 0 : -1}
      hidden={!active}
      className="min-w-0"
    >
      {children}
    </div>
  );
}
