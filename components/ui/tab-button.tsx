import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(({ active = false, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
      active ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
      className
    )}
    {...props}
  />
));

TabButton.displayName = "TabButton";

export { TabButton };
