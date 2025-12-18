import type { LabelHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-semibold text-slate-900", className)}
    {...props}
  />
));

Label.displayName = "Label";

export { Label };
