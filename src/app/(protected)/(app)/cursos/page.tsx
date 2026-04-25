import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { courseAccessMode, effectivePlanForAccess } from "@/lib/plans";
import { courses } from "@/lib/content/courses";
import { GlassCard } from "@/components/glass-card";

export default async function CursosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Cursos</p>
        <h1 className="font-display text-2xl font-semibold text-pg-ink">Aprende no teu ritmo</h1>
        <p className="mt-1 text-sm text-pg-forest/75">Acede aos módulos certos para a tua fase atual.</p>
      </div>
      <div className="space-y-3">
        {courses.map((course) => {
          const mode = courseAccessMode(effectivePlanForAccess(user), course.slug);
          const badge =
            mode === "full"
              ? "Completo"
              : mode === "partial"
                ? "Parcial"
                : "Bloqueado";
          return (
            <Link key={course.slug} href={`/cursos/${course.slug}`}>
              <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">Curso</p>
                    <h2 className="text-lg font-semibold text-neutral-900">{course.title}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{course.description}</p>
                    <p className="mt-3 text-xs font-semibold text-pg-forest/70">Próximo passo: continuar módulo</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-[#27AE60]">
                    {badge}
                  </span>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
