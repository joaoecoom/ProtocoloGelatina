"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const INSTALL_ROUTE = "/app-install";
const APP_HOME_ROUTE = "/app";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function AppInstallGate({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isSuperAdmin) return;
    const standalone = isStandaloneMode();

    if (standalone) {
      if (pathname === INSTALL_ROUTE) router.replace(APP_HOME_ROUTE);
      return;
    }

    if (pathname !== INSTALL_ROUTE) {
      router.replace(INSTALL_ROUTE);
    }
  }, [isSuperAdmin, pathname, router]);

  return null;
}
