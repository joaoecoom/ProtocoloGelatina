export type Ebook = {
  slug: string;
  title: string;
  description: string;
  preview: string;
  pdfUrl: string;
};

export const ebooks: Ebook[] = [
  {
    slug: "barriga-lisa",
    title: "Barriga lisa em 14 dias",
    description: "Hábitos diários + gelatina estratégica.",
    preview:
      "Começa por alinhar água, sono e a gelatina noturna — três alavancas que mudam a forma como o abdómen responde.",
    pdfUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  },
  {
    slug: "plano-7",
    title: "Plano 7 dias",
    description: "Cronograma simples com checklist.",
    preview:
      "Dia 1 foca em desinchar leve, dia 4 introduz rotação de gelatinas — tudo com espaço para a tua rotina real.",
    pdfUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  },
  {
    slug: "receitas",
    title: "Receitas gelificadas",
    description: "Variações gourmet sem açúcar.",
    preview:
      "Base master + 12 combinações rápidas para lanche, pós-treino e jantar leve.",
    pdfUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  },
  {
    slug: "pele-firme",
    title: "Pele firme",
    description: "Nutrientes e rituais que realçam colagénio.",
    preview:
      "Sinergia entre proteína, vitamina C e micro movimentos para pele mais elástica.",
    pdfUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  },
];
