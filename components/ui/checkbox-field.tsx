import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

type CheckboxFieldProps = {
  label: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, className, ...props }, ref) => (
    <label className={cn("flex items-center gap-2 text-sm text-slate-700", className)}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
);

CheckboxField.displayName = "CheckboxField";

export { CheckboxField };
