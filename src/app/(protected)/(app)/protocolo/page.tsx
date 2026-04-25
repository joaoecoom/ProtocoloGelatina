import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  effectivePlanForAccess,
} from "@/lib/plans";
import { ProtocoloHub } from "@/components/protocolo-hub";

export default async function ProtocoloPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const accessPlan = effectivePlanForAccess(user);

  return <ProtocoloHub accessPlan={accessPlan} />;
}
