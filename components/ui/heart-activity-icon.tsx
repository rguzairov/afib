type HeartActivityIconProps = {
  className?: string;
};

export function HeartActivityIcon({ className }: HeartActivityIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.5 10h2.2l1.1-2.3 2.4 4.9 1.3-2.6h2.5"
        stroke="#fff"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
