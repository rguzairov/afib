import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      className
    )}
    {...props}
  />
));

TextArea.displayName = "TextArea";

export { TextArea };
