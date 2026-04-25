import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ebookAccess, effectivePlanForAccess } from "@/lib/plans";
import { ebooks } from "@/lib/content/ebooks";
import { GlassCard } from "@/components/glass-card";
import { PdfViewer } from "@/components/pdf-viewer";

type Params = { slug: string };

export default async function EbookDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const book = ebooks.find((b) => b.slug === slug);
  if (!book) notFound();

  const access = ebookAccess(effectivePlanForAccess(user), slug);

  return (
    <div className="space-y-4">
      <Link href="/ebooks" className="text-sm font-semibold text-rose-500 hover:underline">
        ← Voltar aos ebooks
      </Link>
      <GlassCard>
        <h1 className="font-display text-2xl font-semibold text-neutral-900">{book.title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{book.description}</p>
        <p className="mt-4 rounded-2xl bg-rose-50/80 p-4 text-sm text-neutral-700">{book.preview}</p>
      </GlassCard>

      {access === "full" ? (
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Leitura completa
          </p>
          <div className="mt-4">
            <PdfViewer url={book.pdfUrl} />
          </div>
          <a
            href={book.pdfUrl}
            download
            className="mt-4 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
          >
            Download PDF
          </a>
        </GlassCard>
      ) : access === "preview" ? (
        <GlassCard className="border border-dashed border-rose-200 bg-rose-50/60">
          <p className="text-sm font-semibold text-rose-600">Pré-visualização</p>
          <p className="mt-2 text-sm text-neutral-600">
            O PDF completo está disponível nos planos com ebooks integrais. No plano Front tens o
            ebook de receitas desbloqueado.
          </p>
          <Link
            href="/planos"
            className="mt-3 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
          >
            Desbloquear
          </Link>
        </GlassCard>
      ) : (
        <GlassCard>
          <p className="text-sm text-neutral-600">
            Conteúdo bloqueado para o teu plano atual. Faz upgrade para leitura integral.
          </p>
          <Link
            href="/planos"
            className="mt-3 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
          >
            Ver planos
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
