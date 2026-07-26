"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  type ArticleEtat,
  type StockageOption,
  validerCoherenceEtat,
} from "@/lib/types";

export type ArticleInput = {
  nom: string;
  categorie: string;
  marque: string;
  couleur: string;
  prix: number;
  devise: string;
  stock: number;
  description: string;
  actif: boolean;
  // Champs de la refonte catalogue — absents avant ce correctif, donc
  // silencieusement ignorés par createArticle/updateArticle malgré le
  // payload envoyé par ArticleForm.tsx.
  etat?: ArticleEtat;
  batterie_pct?: number | null;
  stockage_options?: StockageOption[];
  attributs?: Record<string, unknown>;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function getClientId(): string {
  const clientId = process.env.DASHBOARD_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "DASHBOARD_CLIENT_ID non configuré. Ajoutez-le dans .env.local."
    );
  }
  return clientId;
}

function getBucketName(): string {
  return process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "phone";
}

/** Valide les champs obligatoires côté serveur (ne jamais faire confiance au client). */
function validateArticleInput(input: ArticleInput): string | null {
  if (!input.nom?.trim()) return "Le nom est obligatoire.";
  if (!input.categorie?.trim()) return "La catégorie est obligatoire.";
  if (Number.isNaN(input.prix) || input.prix < 0) return "Le prix doit être un nombre positif.";
  if (Number.isNaN(input.stock) || input.stock < 0) return "Le stock doit être un nombre positif ou nul.";

  if (input.etat) {
    const erreurEtat = validerCoherenceEtat(
      input.etat,
      input.batterie_pct,
      input.stockage_options
    );
    if (erreurEtat) return erreurEtat;
  }

  return null;
}

export async function createArticle(input: ArticleInput): Promise<ActionResult> {
  const validationError = validateArticleInput(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabaseAdmin.from("catalogue_articles").insert({
    client_id: getClientId(),
    nom: input.nom.trim(),
    categorie: input.categorie.trim(),
    marque: input.marque?.trim() || null,
    couleur: input.couleur?.trim() || null,
    prix: input.prix,
    devise: input.devise || "XOF",
    stock: input.stock,
    description: input.description?.trim() || null,
    actif: input.actif,
    images: [],
    etat: input.etat ?? null,
    batterie_pct: input.etat === "neuf" ? null : input.batterie_pct ?? null,
    stockage_options: input.stockage_options ?? [],
    attributs: input.attributs ?? {},
  });

  if (error) {
    console.error("createArticle error:", error);
    return { ok: false, error: "Échec de la création. Réessayez." };
  }

  revalidatePath("/articles");
  return { ok: true };
}

export async function updateArticle(
  id: string,
  input: ArticleInput
): Promise<ActionResult> {
  const validationError = validateArticleInput(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabaseAdmin
    .from("catalogue_articles")
    .update({
      nom: input.nom.trim(),
      categorie: input.categorie.trim(),
      marque: input.marque?.trim() || null,
      couleur: input.couleur?.trim() || null,
      prix: input.prix,
      devise: input.devise || "XOF",
      stock: input.stock,
      description: input.description?.trim() || null,
      actif: input.actif,
      etat: input.etat ?? null,
      batterie_pct: input.etat === "neuf" ? null : input.batterie_pct ?? null,
      stockage_options: input.stockage_options ?? [],
      attributs: input.attributs ?? {},
    })
    .eq("id", id)
    .eq("client_id", getClientId()); // ceinture + bretelles : on ne modifie que ses propres articles

  if (error) {
    console.error("updateArticle error:", error);
    return { ok: false, error: "Échec de la mise à jour. Réessayez." };
  }

  revalidatePath("/articles");
  return { ok: true };
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  // Suppression douce : on désactive plutôt que de supprimer réellement,
  // pour ne jamais casser l'historique des commandes qui référencent cet article.
  const { error } = await supabaseAdmin
    .from("catalogue_articles")
    .update({ actif: false })
    .eq("id", id)
    .eq("client_id", getClientId());

  if (error) {
    console.error("deleteArticle error:", error);
    return { ok: false, error: "Échec de la désactivation. Réessayez." };
  }

  revalidatePath("/articles");
  return { ok: true };
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Upload une photo vers le bucket Storage et l'ajoute à la colonne `images`
 * de l'article (en tête de tableau = image principale, cohérent avec la
 * convention déjà en place dans le catalogue existant).
 */
export async function uploadArticlePhoto(
  articleId: string,
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier reçu." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: "Format non supporté. Utilisez JPEG, PNG ou WebP." };
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5 Mo, cohérent avec la limite WhatsApp images
  if (file.size > maxSizeBytes) {
    return { ok: false, error: "Fichier trop volumineux (max 5 Mo)." };
  }

  const clientId = getClientId();
  const bucket = getBucketName();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `articles/${clientId}/${articleId}/${Date.now()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("uploadArticlePhoto storage error:", uploadError);
    return { ok: false, error: "Échec de l'envoi de la photo. Réessayez." };
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicUrlData.publicUrl;

  // Récupère les images actuelles pour ajouter la nouvelle en tête
  const { data: article, error: fetchError } = await supabaseAdmin
    .from("catalogue_articles")
    .select("images")
    .eq("id", articleId)
    .eq("client_id", clientId)
    .single();

  if (fetchError) {
    console.error("uploadArticlePhoto fetch error:", fetchError);
    return { ok: false, error: "Photo envoyée mais échec de la liaison à l'article." };
  }

  const existingImages: string[] = Array.isArray(article?.images) ? article.images : [];
  const updatedImages = [publicUrl, ...existingImages];

  const { error: updateError } = await supabaseAdmin
    .from("catalogue_articles")
    .update({ images: updatedImages })
    .eq("id", articleId)
    .eq("client_id", clientId);

  if (updateError) {
    console.error("uploadArticlePhoto update error:", updateError);
    return { ok: false, error: "Photo envoyée mais échec de la liaison à l'article." };
  }

  revalidatePath("/articles");
  return { ok: true, url: publicUrl };
}

/** Retire une image précise du tableau `images` d'un article (et la supprime du Storage). */
export async function removeArticlePhoto(
  articleId: string,
  imageUrl: string
): Promise<ActionResult> {
  const clientId = getClientId();
  const bucket = getBucketName();

  const { data: article, error: fetchError } = await supabaseAdmin
    .from("catalogue_articles")
    .select("images")
    .eq("id", articleId)
    .eq("client_id", clientId)
    .single();

  if (fetchError) {
    console.error("removeArticlePhoto fetch error:", fetchError);
    return { ok: false, error: "Échec de la récupération de l'article." };
  }

  const existingImages: string[] = Array.isArray(article?.images) ? article.images : [];
  const updatedImages = existingImages.filter((url) => url !== imageUrl);

  const { error: updateError } = await supabaseAdmin
    .from("catalogue_articles")
    .update({ images: updatedImages })
    .eq("id", articleId)
    .eq("client_id", clientId);

  if (updateError) {
    console.error("removeArticlePhoto update error:", updateError);
    return { ok: false, error: "Échec de la suppression de la photo." };
  }

  // Tente de retirer le fichier du Storage. On extrait le chemin depuis l'URL publique.
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const filePath = imageUrl.slice(idx + marker.length);
      await supabaseAdmin.storage.from(bucket).remove([filePath]);
    }
  } catch (storageError) {
    // On ne bloque pas l'utilisateur pour ça : l'image est déjà retirée de l'article.
    console.error("removeArticlePhoto storage cleanup error:", storageError);
  }

  revalidatePath("/articles");
  return { ok: true };
}
