// Mise à jour suite à la décision du 26/07/2026 : "les_deux" est officiel.
// Remplace/complète les interfaces que vous avez collées précédemment.

export interface StockageOption {
  stockage: string; // ex: "128GB", "256GB", "Standard"
  quantite: number; // ex: 5
  prix: number;     // ex: 245000
  etat: 'neuf' | 'reconditionne'; // désormais OBLIGATOIRE par palier
  // (c'est ce champ, pas la colonne `etat` de l'article, qui distingue
  // les paliers neufs des paliers reconditionnés dans un article "les_deux")
}

export type ArticleEtat = 'neuf' | 'reconditionne' | 'les_deux';

export interface CatalogueArticle {
  id?: string;
  nom: string;
  categorie: string;
  description: string | null;
  sku: string | null;
  prix: number; // Prix dérivé (palier le plus bas, tous états confondus)
  devise: string;
  stock: number; // Stock total dérivé (somme de tous les paliers)
  couleur: string | null; // Informatif uniquement — jamais un critère de recherche
  images: string[];
  etat: ArticleEtat;
  batterie_pct: number | null; // NULL si etat='neuf', requis sinon
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

// Aide de validation à réutiliser côté formulaire ET côté server action
// (la contrainte SQL check_batterie_etat fait foi en dernier recours, mais
// mieux vaut échouer tôt côté appli avec un message clair).
export function validerCoherenceEtat(
  etat: ArticleEtat,
  batteriePct: number | null,
  options: StockageOption[]
): string | null {
  if (etat === 'neuf' && batteriePct !== null) {
    return "batterie_pct doit être vide pour un article entièrement neuf.";
  }
  if ((etat === 'reconditionne' || etat === 'les_deux') && batteriePct === null) {
    return "Le pourcentage de batterie est requis dès qu'un palier reconditionné existe.";
  }
  if (etat === 'les_deux') {
    const aNeuf = options.some((o) => o.etat === 'neuf');
    const aRecond = options.some((o) => o.etat === 'reconditionne');
    if (!aNeuf || !aRecond) {
      return "'les_deux' suppose au moins un palier neuf ET un palier reconditionné.";
    }
  }
  if (options.some((o) => o.etat !== 'neuf' && o.etat !== 'reconditionne')) {
    return "Chaque palier de stockage_options doit avoir etat = 'neuf' ou 'reconditionne'.";
  }
  return null;
}
