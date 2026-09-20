type LogoProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function Logo({ className = "", variant = "dark" }: LogoProps) {
  const mark =
    variant === "light"
      ? "bg-orange-300 text-stone-950"
      : "bg-orange-800 text-white";

  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] ${mark}`}>
        LS
      </span>
      LiveShift
    </span>
  );
}
