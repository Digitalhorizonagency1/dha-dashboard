'use server';

import { createClient } from '@supabase/supabase-js';
import { CatalogueArticleFormData } from '@/types/catalogue';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveArticleAction(data: CatalogueArticleFormData) {
  try {
    // 1. Validation de la contrainte batterie_pct
    if (data.etat === 'reconditionne') {
      if (data.batterie_pct === null || data.batterie_pct === undefined || data.batterie_pct < 0 || data.batterie_pct > 100) {
        return { success: false, error: 'Pour un article reconditionné, le % de batterie est obligatoire (0-100%).' };
      }
    } else {
      // Si l'article est neuf, la batterie_pct doit être NULL
      data.batterie_pct = null;
    }

    // 2. Calcul du prix dérivé (le plus bas palier) et du stock total
    const options = data.stockage_options || [];
    const minPrix = options.length > 0 
      ? Math.min(...options.map((opt) => Number(opt.prix)))
      : 0;

    const totalStock = options.length > 0 
      ? options.reduce((sum, opt) => sum + Number(opt.quantite), 0)
      : 0;

    // 3. Objet à enregistrer dans Supabase
    const payload = {
      nom: data.nom,
      categorie: data.categorie,
      description: data.description || null,
      sku: data.sku || null,
      devise: data.devise || 'XAF',
      couleur: data.couleur || null,
      images: data.images || [],
      etat: data.etat,
      batterie_pct: data.batterie_pct,
      stockage_options: options,
      prix: minPrix,       // Prix plancher dérivé
      stock: totalStock,   // Stock total dérivé
      attributs: data.attributs || {},
    };

    let result;
    if (data.id) {
      // Modification
      result = await supabase
        .from('catalogue_articles')
        .update(payload)
        .eq('id', data.id)
        .select()
        .single();
    } else {
      // Création
      result = await supabase
        .from('catalogue_articles')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erreur Supabase:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
