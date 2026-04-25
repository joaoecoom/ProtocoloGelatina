export type Lesson = {
  id: string;
  title: string;
  vimeoId: string;
  durationMin: number;
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  accent: string;
  modules: Module[];
};

export const courses: Course[] = [
  {
    slug: "mentalidade",
    title: "Mentalidade",
    description: "Reprograma crenças sobre comida e corpo.",
    accent: "from-rose-200 to-pink-100",
    modules: [
      {
        id: "m1",
        title: "Identidade saudável",
        lessons: [
          {
            id: "l1",
            title: "O teu novo padrão",
            vimeoId: "76979871",
            durationMin: 12,
          },
          {
            id: "l2",
            title: "Rituais mínimos",
            vimeoId: "76979871",
            durationMin: 9,
          },
        ],
      },
      {
        id: "m2",
        title: "Consistência real",
        lessons: [
          {
            id: "l3",
            title: "Dias difíceis",
            vimeoId: "76979871",
            durationMin: 11,
          },
        ],
      },
    ],
  },
  {
    slug: "fome",
    title: "Controlo da fome",
    description: "Ferramentas práticas para picos e fome emocional.",
    accent: "from-emerald-100 to-teal-50",
    modules: [
      {
        id: "m1",
        title: "Bioquímica simples",
        lessons: [
          {
            id: "l1",
            title: "Saciedade em 3 passos",
            vimeoId: "76979871",
            durationMin: 14,
          },
        ],
      },
    ],
  },
  {
    slug: "pele",
    title: "Corpo e pele",
    description: "Colagénio, hidratação e firmeza.",
    accent: "from-fuchsia-100 to-rose-50",
    modules: [
      {
        id: "m1",
        title: "Pele firme",
        lessons: [
          {
            id: "l1",
            title: "Rotina 7 minutos",
            vimeoId: "76979871",
            durationMin: 10,
          },
        ],
      },
    ],
  },
  {
    slug: "inchaco",
    title: "Anti-inchaço",
    description: "Rotinas para acordar mais leve.",
    accent: "from-sky-100 to-indigo-50",
    modules: [
      {
        id: "m1",
        title: "Desinchar estratégico",
        lessons: [
          {
            id: "l1",
            title: "Mapa do inchaço",
            vimeoId: "76979871",
            durationMin: 13,
          },
        ],
      },
    ],
  },
  {
    slug: "manutencao",
    title: "Manutenção",
    description: "Como não recuperar peso após o sprint inicial.",
    accent: "from-amber-100 to-orange-50",
    modules: [
      {
        id: "m1",
        title: "Estabilizar",
        lessons: [
          {
            id: "l1",
            title: "Checklist semanal",
            vimeoId: "76979871",
            durationMin: 8,
          },
        ],
      },
    ],
  },
];
