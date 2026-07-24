"use client";

import { useRef, useState } from "react";
import type { Article } from "@/lib/types";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  uploadArticlePhoto,
  removeArticlePhoto,
  type ArticleInput,
} from "@/actions/articles";

type Props = {
  article: Article | null;
  onClose: () => void;
  onSaved: (article: Article, isNew: boolean) => void;
  onDeactivated: (id: string) => void;
};

const emptyInput: ArticleInput = {
  nom: "",
  categorie: "",
  marque: "",
  couleur: "",
  prix: 0,
  devise: "XOF",
  stock: 0,
  description: "",
  actif: true,
};

export default function ArticleForm({ article, onClose, onSaved, onDeactivated }: Props) {
  const isNew = article === null;
  const [input, setInput] = useState<ArticleInput>(
    article
      ? {
          nom: article.nom,
          categorie: article.categorie,
          marque: article.marque ?? "",
          couleur: article.couleur ?? "",
          prix: article.prix,
          devise: article.devise,
          stock: article.stock,
          description: article.description ?? "",
          actif: article.actif,
        }
      : emptyInput
  );
  const [images, setImages] = useState<string[]>(article?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = isNew
      ? await createArticle(input)
      : await updateArticle(article!.id, input);

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // On reconstruit un objet Article complet pour la mise à jour optimiste
    // côté liste (id réel non disponible immédiatement pour une création :
    // dans ce cas on referme et laisse la revalidation de page faire foi).
    if (isNew) {
      onClose();
      // Rechargement simple pour récupérer l'id généré côté serveur
      window.location.reload();
      return;
    }

    onSaved(
      {
        ...article!,
        ...input,
        marque: input.marque || null,
        couleur: input.couleur || null,
        description: input.description || null,
        images,
      },
      false
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !article) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadArticlePhoto(article.id, formData);
    setUploading(false);

    // Permet de re-sélectionner le même fichier une deuxième fois si besoin
    e.target.value = "";

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Ajoute la nouvelle photo en tête, sans recharger toute la page :
    // le formulaire reste ouvert et on peut enchaîner plusieurs photos.
    setImages((prev) => [result.url, ...prev]);
  }

  async function handleRemovePhoto(url: string) {
    if (!article) return;
    const previousImages = images;
    setImages((prev) => prev.filter((u) => u !== url));

    const result = await removeArticlePhoto(article.id, url);
    if (!result.ok) {
      setError(result.error);
      // Échec : on remet la photo dans la liste locale plutôt que de
      // recharger toute la page (ce qui fermerait le formulaire).
      setImages(previousImages);
    }
  }

  async function handleDeactivate() {
    if (!article) return;
    if (!confirm(`Désactiver "${article.nom}" ? Il n'apparaîtra plus dans le bot.`)) return;

    setSaving(true);
    const result = await deleteArticle(article.id);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onDeactivated(article.id);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            {isNew ? "Nouvel article" : "Modifier l'article"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        {!isNew && (
          <div className="mb-5 flex flex-col gap-2">
            <span className="text-sm text-[var(--text-dim)]">Photos</span>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Retirer
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[var(--text-dim)] hover:border-[var(--text-dim)]"
              >
                {uploading ? "Envoi…" : "+ Photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <span className="text-xs text-[var(--text-dim)]">
              La première photo est utilisée comme image principale.
            </span>
          </div>
        )}

        {isNew && (
          <p className="mb-4 rounded-md bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-dim)]">
            Enregistrez d&apos;abord l&apos;article pour pouvoir y ajouter des photos.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Nom" required>
            <input
              required
              value={input.nom}
              onChange={(e) => updateField("nom", e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie" required>
              <input
                required
                value={input.categorie}
                onChange={(e) => updateField("categorie", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Marque">
              <input
                value={input.marque}
                onChange={(e) => updateField("marque", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Couleur">
              <input
                value={input.couleur}
                onChange={(e) => updateField("couleur", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Devise">
              <input
                value={input.devise}
                onChange={(e) => updateField("devise", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix" required>
              <input
                type="number"
                min={0}
                step="1"
                required
                value={input.prix}
                onChange={(e) => updateField("prix", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Stock" required>
              <input
                type="number"
                min={0}
                step="1"
                required
                value={input.stock}
                onChange={(e) => updateField("stock", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={input.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              className="input resize-none"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={input.actif}
              onChange={(e) => updateField("actif", e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Actif (visible par le bot)
          </label>

          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            {!isNew ? (
              <button
                type="button"
                onClick={handleDeactivate}
                className="text-sm text-[var(--danger)] hover:opacity-80"
              >
                Désactiver l&apos;article
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#04120a] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--text-dim)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
