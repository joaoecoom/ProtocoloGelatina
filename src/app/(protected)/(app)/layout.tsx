import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BrandLogo } from "@/components/brand-logo";
import { BottomNav } from "@/components/bottom-nav";
import { WelcomeGuideModal } from "@/components/welcome-guide-modal";
import { AppHeaderLinks } from "@/components/app-header-links";
import { AppInstallGate } from "@/components/app-install-gate";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (!user.onboardingCompleted) redirect("/onboarding");

  return (
    <div
      className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-3"
      suppressHydrationWarning
    >
      <header
        className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 border-b border-pg-forest/8 bg-[rgba(241,247,243,0.78)] py-2 backdrop-blur-xl"
        suppressHydrationWarning
      >
        <div className="min-w-0 flex-1" suppressHydrationWarning>
          <Link
            href="/app"
            className="mb-1.5 inline-block max-w-full focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-pg-berry/30 focus-visible:ring-offset-2 sm:mb-2"
            aria-label="Início / Protocolo Gelatina Inteligente"
          >
            <BrandLogo variant="header" className="opacity-95" />
          </Link>
          <h1 className="font-display mt-1 text-[1.08rem] font-semibold leading-tight text-pg-ink sm:text-xl">
            Olá, {user.name.split(" ")[0]}
            {user.isSuperAdmin ? (
              <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-amber-600">
                Admin
              </span>
            ) : null}
          </h1>
        </div>
        <AppHeaderLinks isSuperAdmin={user.isSuperAdmin} avatarUrl={user.avatarUrl} />
      </header>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold text-pg-berry/90">
        <Link href="/ebooks" className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1.5 whitespace-nowrap">
          Ebooks
        </Link>
        <Link href="/loja" className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1.5 whitespace-nowrap">
          Loja
        </Link>
        {user.isSuperAdmin ? (
          <Link href="/admin" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 whitespace-nowrap">
            Admin
          </Link>
        ) : null}
      </nav>
      <WelcomeGuideModal
        userId={user.id}
        showFromServer={user.welcomeGuideDismissedAt == null}
      />
      <AppInstallGate isSuperAdmin={user.isSuperAdmin} />
      {children}
      <BottomNav />
    </div>
  );
}
