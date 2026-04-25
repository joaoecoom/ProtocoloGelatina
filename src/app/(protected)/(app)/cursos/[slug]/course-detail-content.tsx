"use client";

import Link from "next/link";
import type { Course } from "@/lib/content/courses";
import { GlassCard } from "@/components/glass-card";
import { VimeoEmbed } from "@/components/vimeo-embed";

export type CourseAccessMode = "none" | "partial" | "full";

export type CourseDetailContentProps = {
  mode: CourseAccessMode;
  course: Course;
};

export function CourseDetailContent({ mode, course }: CourseDetailContentProps) {
  if (mode === "none") {
    return (
      <div className="space-y-4">
        <Link href="/cursos" className="text-sm font-semibold text-rose-500 hover:underline">
          ← Voltar aos cursos
        </Link>
        <GlassCard>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">{course.title}</h1>
          <p className="mt-3 text-sm text-neutral-600">
            Este curso faz parte dos upgrades com acesso completo aos módulos em vídeo.
          </p>
          <Link
            href="/planos"
            className="mt-4 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
          >
            Ver planos e desbloquear
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/cursos" className="text-sm font-semibold text-rose-500 hover:underline">
        ← Voltar aos cursos
      </Link>
      <GlassCard>
        <h1 className="font-display text-2xl font-semibold text-neutral-900">{course.title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{course.description}</p>
      </GlassCard>

      {course.modules.map((module, moduleIndex) => {
        const moduleLocked = mode === "partial" && moduleIndex > 0;
        return (
          <GlassCard key={module.id}>
            <h2 className="text-lg font-semibold text-neutral-900">{module.title}</h2>
            {moduleLocked ? (
              <p className="mt-3 text-sm text-neutral-600">
                Módulo disponível no plano completo. Faz upgrade em{" "}
                <Link href="/planos" className="font-semibold text-[#27AE60] hover:underline">
                  Planos
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {module.lessons.map((lesson) => (
                  <div key={lesson.id}>
                    <p className="text-sm font-semibold text-neutral-800">{lesson.title}</p>
                    <p className="text-xs text-neutral-500">{lesson.durationMin} min</p>
                    <div className="mt-3">
                      <VimeoEmbed vimeoId={lesson.vimeoId} title={lesson.title} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
