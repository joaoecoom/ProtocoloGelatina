export type ShopProduct = {
  id: string;
  title: string;
  priceEuro: number;
  description: string;
  affiliateUrl: string;
  hasVsl: boolean;
};

export const shopProducts: ShopProduct[] = [
  {
    id: "colageno",
    title: "Colagénio Verisol®",
    priceEuro: 29,
    description: "Apoio à firmeza da pele — link de afiliado exemplo.",
    affiliateUrl: "https://example.com/affiliate/colagenio",
    hasVsl: true,
  },
  {
    id: "gelatina-bio",
    title: "Gelatina pastos bio",
    priceEuro: 9.9,
    description: "Folhas sem aditivos para o teu ritual diário.",
    affiliateUrl: "https://example.com/affiliate/gelatina",
    hasVsl: false,
  },
];
