export interface StockageOption {
  stockage: string;
  prix: number;
  quantite: number;
  etat: "neuf" | "reconditionne"; // désormais obligatoire par palier
}

export type ArticleEtat = "neuf" | "reconditionne" | "les_deux";

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
  etat?: ArticleEtat | null; // corrigé : le "| string" annulait les littéraux
  batterie_pct?: number | null;
  stockage_options?: StockageOption[] | null;
  attributs?: Record<string, unknown> | null;
  client_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Cohérence etat / batterie_pct / paliers.
 * Utilisée à la fois par le formulaire (retour rapide à l'utilisateur) et par
 * la server action (ne jamais faire confiance au seul client) — cf. le
 * commentaire déjà présent dans articles.ts sur ce principe.
 */
export function validerCoherenceEtat(
  etat: ArticleEtat | null | undefined,
  batteriePct: number | null | undefined,
  options: StockageOption[] | null | undefined
): string | null {
  const opts = options ?? [];

  if (opts.some((o) => o.etat !== "neuf" && o.etat !== "reconditionne")) {
    return "Chaque palier de stockage doit préciser etat = 'neuf' ou 'reconditionne'.";
  }

  if (etat === "neuf") {
    if (batteriePct !== null && batteriePct !== undefined) {
      return "batterie_pct doit être vide pour un article entièrement neuf.";
    }
  } else if (etat === "reconditionne" || etat === "les_deux") {
    if (
      batteriePct === null ||
      batteriePct === undefined ||
      batteriePct < 0 ||
      batteriePct > 100
    ) {
      return "Le pourcentage de batterie (0-100) est requis dès qu'un état reconditionné est présent.";
    }
  }

  if (etat === "les_deux") {
    const aNeuf = opts.some((o) => o.etat === "neuf");
    const aRecond = opts.some((o) => o.etat === "reconditionne");
    if (!aNeuf || !aRecond) {
      return "'les_deux' nécessite au moins un palier neuf et un palier reconditionné.";
    }
  }

  return null;
}
