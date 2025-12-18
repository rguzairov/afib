"use client";

import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import { TabButton } from "./tab-button";
import { cn } from "./utils";

export type TabsItem<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

type TabListProps<T extends string> = {
  idBase: string;
  value: T;
  onValueChange: (next: T) => void;
  tabs: Array<TabsItem<T>>;
  "aria-label"?: string;
  className?: string;
};

export function TabList<T extends string>({
  idBase,
  value,
  onValueChange,
  tabs,
  className,
  "aria-label": ariaLabel,
}: TabListProps<T>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndexes = useMemo(
    () => tabs.map((tab, index) => (tab.disabled ? null : index)).filter((x): x is number => x !== null),
    [tabs],
  );

  const focusTab = (index: number) => {
    const el = tabRefs.current[index];
    if (el) el.focus();
  };

  const moveTo = (targetIndex: number) => {
    const tab = tabs[targetIndex];
    if (!tab || tab.disabled) return;
    onValueChange(tab.value);
    requestAnimationFrame(() => focusTab(targetIndex));
  };

  const getCurrentIndex = () => {
    const focused = tabRefs.current.findIndex((el) => el === document.activeElement);
    if (focused >= 0) return focused;
    const selected = tabs.findIndex((tab) => tab.value === value);
    return selected >= 0 ? selected : 0;
  };

  const moveBy = (delta: number) => {
    if (enabledIndexes.length === 0) return;
    const current = getCurrentIndex();
    const currentEnabledPos = enabledIndexes.indexOf(current);
    const startPos = currentEnabledPos >= 0 ? currentEnabledPos : 0;
    const nextPos = (startPos + delta + enabledIndexes.length) % enabledIndexes.length;
    moveTo(enabledIndexes[nextPos]);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveBy(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveBy(-1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(enabledIndexes[0]);
        break;
      case "End":
        event.preventDefault();
        moveTo(enabledIndexes[enabledIndexes.length - 1]);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        moveTo(getCurrentIndex());
        break;
      default:
        break;
    }
  };

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm",
        "w-full min-w-0 overflow-x-auto",
        className,
      )}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <TabButton
            key={tab.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`${idBase}-tab-${tab.value}`}
            role="tab"
            aria-selected={active}
            aria-controls={`${idBase}-panel-${tab.value}`}
            tabIndex={active ? 0 : -1}
            active={active}
            disabled={tab.disabled}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </TabButton>
        );
      })}
    </nav>
  );
}
