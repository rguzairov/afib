import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

const sectionCardClasses = "rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm min-w-0";

const Card = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(sectionCardClasses, className)} {...props} />
));

Card.displayName = "Card";

const SectionCard = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(({ className, ...props }, ref) => (
  <section ref={ref} className={cn(sectionCardClasses, className)} {...props} />
));

SectionCard.displayName = "SectionCard";

export { Card, SectionCard };
