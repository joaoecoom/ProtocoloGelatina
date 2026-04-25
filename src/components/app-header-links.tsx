import Link from "next/link";
import { cn } from "@/lib/cn";

function iconLinkClass() {
  return "inline-flex h-10 w-10 items-center justify-center rounded-full text-pg-rose-muted/90 transition hover:bg-pg-mint/80 hover:text-pg-berry";
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0018 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-1.312 4.962c-.83 1.12-1.646 1.856-2.328 2.31M15 11a3 3 0 11-6 0m9 6v.75a.75.75 0 01-.75.75h-12a.75.75 0 01-.75-.75V17c0-.703.466-1.335 1.17-1.52C4.698 14.89 6 12.75 6 9V9a6 6 0 1112 0v.75c0 3.75 1.302 5.89 2.58 6.48.704.185 1.17.817 1.17 1.52z"
      />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992.006.217.006.437 0 .655-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.578 6.578 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

export function AppHeaderLinks({
  isSuperAdmin,
  avatarUrl,
}: {
  isSuperAdmin: boolean;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-1">
      <nav className="flex items-center justify-end gap-1" aria-label="Conta e alertas">
        <Link
          href="/notificacoes"
          className={cn(
            iconLinkClass(),
            "min-h-11 min-w-11 touch-manipulation cursor-pointer",
            "active:scale-[0.98]",
          )}
          aria-label="Notificações"
          title="Notificações"
        >
          <BellIcon />
        </Link>
        <Link
          href="/configuracoes"
          className={iconLinkClass()}
          aria-label="Configurações"
          title="Configurações"
        >
          <CogIcon />
        </Link>
        <Link href="/perfil" className={iconLinkClass()} aria-label="Perfil" title="Perfil">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-pg-forest/10 ring-offset-1 ring-offset-white/80"
            />
          ) : (
            <UserIcon />
          )}
        </Link>
      </nav>
    </div>
  );
}
