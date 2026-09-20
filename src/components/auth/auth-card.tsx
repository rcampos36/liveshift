export function AuthCard({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-2xl border border-stone-200/80 bg-white/90 p-8 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur ${
        wide ? "max-w-5xl" : "max-w-md"
      }`}
    >
      {children}
    </div>
  );
}
