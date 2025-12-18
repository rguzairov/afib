import { cn } from "./utils";

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
