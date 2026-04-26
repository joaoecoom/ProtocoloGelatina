import Image from "next/image";
import { cn } from "@/lib/cn";

const SRC = "/brand/protocolo-gelatina-logo-v3.png";

export type BrandLogoVariant = "hero" | "header" | "auth";

type Props = {
  variant: BrandLogoVariant;
  className?: string;
  /** Prioridade de carregamento (ex.: LCP no hero) */
  priority?: boolean;
};

const byVariant: Record<BrandLogoVariant, string> = {
  hero: "h-auto w-64 max-w-full object-contain sm:w-72",
  // Cabeçalho: logótipo legível, em linha com a saudação (vertical stack do PNG).
  header:
    "h-auto w-32 max-w-[min(100%,8.5rem)] object-contain object-left sm:w-36 sm:max-w-[9.5rem]",
  auth: "mx-auto h-auto w-48 object-contain sm:w-56",
};

const bySizes: Record<BrandLogoVariant, string> = {
  hero: "(max-width: 640px) 80vw, 320px",
  header: "(max-width: 640px) 11.5rem, 13.5rem",
  auth: "224px",
};

/**
 * Marca "PROTOCOLO GELATINA INTELIGENTE" (asset em `/public/brand/protocolo-gelatina-logo-v3.png`).
 */
export function BrandLogo({ variant, className, priority }: Props) {
  return (
    <Image
      src={SRC}
      alt="Protocolo Gelatina Inteligente"
      width={800}
      height={520}
      className={cn(byVariant[variant], className)}
      priority={priority ?? (variant === "hero" || variant === "auth")}
      sizes={bySizes[variant]}
    />
  );
}
