import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { courseAccessMode, effectivePlanForAccess } from "@/lib/plans";
import { courses } from "@/lib/content/courses";
import { CourseDetailShell } from "./course-detail-shell";

type Params = { slug: string };

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();

  const mode = courseAccessMode(effectivePlanForAccess(user), slug);

  return <CourseDetailShell mode={mode} course={course} />;
}
