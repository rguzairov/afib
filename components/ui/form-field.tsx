import type { ReactNode } from "react";
import { cn } from "./utils";
import { Label } from "./label";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  helper?: string;
  error?: string;
  className?: string;
};

export function FormField({ id, label, children, helper, error, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
