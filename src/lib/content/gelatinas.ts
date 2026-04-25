export type GelatinaTier = "base" | "premium";

export type Gelatina = {
  slug: string;
  name: string;
  tier: GelatinaTier;
  emoji: string;
  benefit: string;
  when: string;
  recipe: string[];
};

export const protocolIntro = {
  what:
    "O Protocolo Gelatina Inteligente é um ritual diário de gelatina funcional, sem açúcar, que apoia saciedade, hidratação tecidual e um metabolismo mais estável — sem dietas extremas. Combinada com frutas, legumes e outros alimentos, torna-se ainda mais eficaz quando é feita na medida certa e tomada na hora certa.",
  why: "A gelatina rica em glicina e proteína colagenoide ajuda a estruturar refeições, reduz picos de fome e acompanha o teu foco em emagrecimento sustentável. A combinação com frutas, vegetais e outros alimentos certos pode reduzir inchaço, apoiar perda de peso, melhorar energia, qualidade do sono e aliviar stress acumulado.",
  how: [
    "Dissolve a gelatina em água morna (sem ferver).",
    "Adiciona ingrediente ativo (sumo, chá, especiarias).",
    "Refrigera até firmar (mínimo 2 horas).",
  ],
  when: "Usa antes do almoço ou como lanche entre refeições, sempre alinhada com a tua água e sono.",
  duration:
    "Cria hábito contínuo: podes iniciar planos com duração definida e repetir/combinar ciclos para manter consistência ao longo do tempo.",
};

export const gelatinas: Gelatina[] = [
  {
    slug: "limao",
    name: "Sensação de leveza e apoio digestivo",
    tier: "base",
    emoji: "🍋",
    benefit: "Sensação de leveza e apoio digestivo.",
    when: "Manhã ou antes do almoço.",
    recipe: [
      "250 ml de água morna",
      "1 folha de gelatina sem sabor (10g em pó)",
      "Sumo de meio limão bio",
    ],
  },
  {
    slug: "gengibre",
    name: "Aquece o metabolismo e ajuda no inchaço leve",
    tier: "base",
    emoji: "🫚",
    benefit: "Aquece o metabolismo e ajuda no inchaço leve.",
    when: "Meio da manhã.",
    recipe: [
      "200 ml de infusão de gengibre fresca",
      "10g de gelatina sem sabor",
      "Raspa de lima opcional",
    ],
  },
  {
    slug: "cha-verde",
    name: "Apoio antioxidante e foco na fome emocional",
    tier: "base",
    emoji: "🍵",
    benefit: "Apoio antioxidante e foco na fome emocional.",
    when: "Tarde, se tolerares cafeína.",
    recipe: [
      "200 ml de chá verde morno",
      "10g de gelatina sem sabor",
      "1 pitada de canela",
    ],
  },
  {
    slug: "vinagre",
    name: "Estabilidade glicémica ao jantar",
    tier: "base",
    emoji: "🍎",
    benefit: "Estabilidade glicémica percebida ao jantar.",
    when: "30 minutos antes do jantar (diluído).",
    recipe: [
      "200 ml de água morna",
      "1 colher de sopa de vinagre de maçã",
      "10g de gelatina sem sabor",
    ],
  },
  {
    slug: "pepino",
    name: "Hidratação profunda e barriga mais calma",
    tier: "base",
    emoji: "🥒",
    benefit: "Hidratação profunda e sensação de barriga mais calma.",
    when: "Após treino leve ou lanche.",
    recipe: [
      "150 ml de sumo de pepino natural",
      "100 ml de água de coco",
      "10g de gelatina sem sabor",
    ],
  },
  {
    slug: "noturna",
    name: "Recuperação noturna e sono mais estável",
    tier: "base",
    emoji: "🌙",
    benefit: "Apoio a melhor sono e recuperação noturna.",
    when: "1 hora antes de deitares.",
    recipe: [
      "200 ml de leite de amêndoa sem açúcar morno",
      "10g de gelatina sem sabor",
      "1 pitada de cardamomo",
    ],
  },
  {
    slug: "kiwi",
    name: "Conforto digestivo acelerado",
    tier: "premium",
    emoji: "🥝",
    benefit: "Enzimas naturais que aceleram o conforto digestivo.",
    when: "Final do dia em protocolos de desinchar.",
    recipe: [
      "1 kiwi maduro esmagado",
      "150 ml de água morna",
      "10g de gelatina sem sabor",
    ],
  },
  {
    slug: "banana",
    name: "Saciedade suave e apoio no pós-treino",
    tier: "premium",
    emoji: "🍌",
    benefit: "Potássio e saciedade suave em dias de treino.",
    when: "Pós-treino ou lanche doce saudável.",
    recipe: [
      "Meia banana amassada",
      "200 ml de leite vegetal sem açúcar",
      "10g de gelatina sem sabor",
    ],
  },
  {
    slug: "combinacoes",
    name: "Rotações estratégicas anti-plateau",
    tier: "premium",
    emoji: "✨",
    benefit: "Rotações semanais para quebrar plateau.",
    when: "Dias de maior fome ou retenção.",
    recipe: [
      "Base de gelatina 10g",
      "Camada 1: chá verde morno",
      "Camada 2: pepino + hortelã (após firmar primeira camada)",
    ],
  },
];

export const commonMistakes = [
  "Adicionar açúcar ou compotas industrializadas.",
  "Não hidratar a gelatina em líquido morno (empelota).",
  "Saltar o ritual nos fins de semana — o hábito perde força.",
];

export const shoppingList = [
  "Gelatina sem sabor (folhas ou pó)",
  "Limões, gengibre fresco, chá verde",
  "Vinagre de maçã cru, pepinos bio",
  "Leite vegetal sem açúcar, kiwis, bananas maduras",
];
