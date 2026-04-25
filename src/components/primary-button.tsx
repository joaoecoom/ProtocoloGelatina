import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "green" | "rose" | "ghost";
};

export function PrimaryButton({
  className,
  variant = "green",
  type = "button",
  ...props
}: Props) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold tracking-tight transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pg-berry/25 focus-visible:ring-offset-2";
  const styles =
    variant === "green"
      ? "pg-cta-forest"
      : variant === "rose"
        ? "pg-cta-berry"
        : "border border-white/60 bg-white/60 text-pg-ink shadow-sm ring-1 ring-pg-forest/5 backdrop-blur-sm hover:border-pg-forest/20 hover:bg-white/90";

  return <button type={type} className={cn(base, styles, className)} {...props} />;
}
