export interface StockageOption {
  stockage: string;
  prix: number;
  quantite: number;
}

export interface Article {
  id?: string;
  nom: string;
  categorie: string;
  marque?: string | null;
  couleur?: string | null;
  devise: string;
  prix: number;
  stock: number;
  description?: string | null;
  images: string[];
  actif?: boolean;
  
  // Nouveaux champs ajoutés pour la refonte catalogue
  etat?: "neuf" | "reconditionne" | string | null;
  batterie_pct?: number | null;
  stockage_options?: StockageOption[] | null;
  attributs?: Record<string, unknown> | null;
  client_id?: string;
  created_at?: string;
  updated_at?: string;
}
