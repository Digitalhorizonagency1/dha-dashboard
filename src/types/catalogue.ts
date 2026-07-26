export interface StockageOption {
  stockage: string; // ex: "128GB", "256GB", "Standard"
  quantite: number; // ex: 5
  prix: number;     // ex: 245000
}

export type ArticleEtat = 'neuf' | 'reconditionne';

export interface CatalogueArticle {
  id?: string;
  nom: string;
  categorie: string;
  description: string | null;
  sku: string | null;
  prix: number; // Prix dérivé (palier le plus bas)
  devise: string;
  stock: number; // Stock total derivé
  couleur: string | null; // Informatif uniquement (ex: "Blanc, Noir, Bleu")
  images: string[];
  etat: ArticleEtat;
  batterie_pct: number | null; // Requis si etat === 'reconditionne'
  stockage_options: StockageOption[];
  attributs?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type CatalogueArticleFormData = Omit<
  CatalogueArticle,
  'id' | 'prix' | 'stock' | 'created_at' | 'updated_at'
> & {
  id?: string;
};
