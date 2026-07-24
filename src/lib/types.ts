export type Article = {
  id: string;
  client_id: string;
  nom: string;
  categorie: string;
  marque: string | null;
  couleur: string | null;
  prix: number;
  devise: string;
  stock: number;
  description: string | null;
  attributs: Record<string, unknown> | null;
  images: string[];
  actif: boolean;
  created_at: string;
};
