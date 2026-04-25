"use client";

import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <PrimaryButton type="button" variant="ghost" className={className} onClick={() => void logout()}>
      Terminar sessão
    </PrimaryButton>
  );
}
