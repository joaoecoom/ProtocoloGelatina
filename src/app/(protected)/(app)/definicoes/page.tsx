import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function DefinicoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  redirect("/perfil");
}
