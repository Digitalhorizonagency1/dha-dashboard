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

export interface StockageOption {
  stockage: string;
  prix: number;
  quantite: number;
}

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
          actif: article.actif ?? true,
        }
      : emptyInput
  );

  // État Reconditionné & Batterie
  const [isReconditionne, setIsReconditionne] = useState<boolean>(
    article?.etat === "reconditionne"
  );
  const [batteriePct, setBatteriePct] = useState<number | "">(
    article?.batterie_pct ?? 85
  );

  // Paliers de stockage (Capacités, Prix & Stocks)
  const initialStockage: StockageOption[] =
    article?.stockage_options &&
    Array.isArray(article.stockage_options) &&
    article.stockage_options.length > 0
      ? (article.stockage_options as StockageOption[])
      : [{ stockage: "128GB", prix: article?.prix || 0, quantite: article?.stock || 0 }];

  const [stockageOptions, setStockageOptions] = useState<StockageOption[]>(initialStockage);

  const [images, setImages] = useState<string[]>(article?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const handleAddPalier = () => {
    setStockageOptions((prev) => [...prev, { stockage: "", prix: 0, quantite: 1 }]);
  };

  const handleRemovePalier = (idx: number) => {
    if (stockageOptions.length > 1) {
      setStockageOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handlePalierChange = (
    idx: number,
    field: keyof StockageOption,
    value: string | number
  ) => {
    setStockageOptions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const prixMin =
      stockageOptions.length > 0
        ? Math.min(...stockageOptions.map((o) => Number(o.prix) || 0))
        : input.prix;

    const stockTotal = stockageOptions.reduce(
      (acc, o) => acc + (Number(o.quantite) || 0),
      0
    );

    const payload: ArticleInput & Record<string, unknown> = {
      ...input,
      prix: prixMin,
      stock: stockTotal,
      etat: isReconditionne ? "reconditionne" : "neuf",
      batterie_pct: isReconditionne ? Number(batteriePct) || 85 : null,
      stockage_options: stockageOptions.map((opt) => ({
        stockage: opt.stockage.trim() || "Standard",
        prix: Number(opt.prix) || 0,
        quantite: Number(opt.quantite) || 0,
      })),
    };

    const result = isNew
      ? await createArticle(payload as ArticleInput)
      : await updateArticle(article!.id!, payload as ArticleInput); // <-- CORRECTION (id!)

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (isNew) {
      onClose();
      window.location.reload();
      return;
    }

    onSaved(
      {
        ...article!,
        ...payload,
        marque: input.marque || null,
        couleur: input.couleur || null,
        description: input.description || null,
        images,
        etat: isReconditionne ? "reconditionne" : "neuf",
        batterie_pct: isReconditionne ? Number(batteriePct) || 85 : null,
        stockage_options: stockageOptions,
      },
      false
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !article || !article.id) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadArticlePhoto(article.id, formData);
    setUploading(false);

    e.target.value = "";

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setImages((prev) => [result.url, ...prev]);
  }

  async function handleRemovePhoto(url: string) {
    if (!article || !article.id) return;
    const previousImages = images;
    setImages((prev) => prev.filter((u) => u !== url));

    const result = await removeArticlePhoto(article.id, url);
    if (!result.ok) {
      setError(result.error);
      setImages(previousImages);
    }
  }

  async function handleDeactivate() {
    if (!article || !article.id) return;
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
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

          {/* CASE À COCHER : RECONDITIONNÉ */}
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isReconditionne}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsReconditionne(checked);
                  if (checked && !batteriePct) setBatteriePct(85);
                }}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Cet article est reconditionné
            </label>

            {isReconditionne && (
              <div className="mt-1 pt-2 border-t border-[var(--border)]">
                <Field label="Batterie (%)" required>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required={isReconditionne}
                    placeholder="ex: 88"
                    value={batteriePct}
                    onChange={(e) =>
                      setBatteriePct(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="input w-28 text-center font-bold text-[var(--accent)]"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* PALIERS DE STOCKAGE & PRIX ASSOCIÉS */}
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                Capacités & Prix
              </span>
              <button
                type="button"
                onClick={handleAddPalier}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                + Ajouter une capacité
              </button>
            </div>

            {stockageOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    placeholder="Stockage (ex: 128GB)"
                    required
                    value={opt.stockage}
                    onChange={(e) => handlePalierChange(idx, "stockage", e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder={`Prix (${input.devise})`}
                    required
                    min={0}
                    value={opt.prix || ""}
                    onChange={(e) => handlePalierChange(idx, "prix", Number(e.target.value))}
                    className="input font-semibold"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    placeholder="Stock"
                    required
                    min={0}
                    value={opt.quantite}
                    onChange={(e) => handlePalierChange(idx, "quantite", Number(e.target.value))}
                    className="input"
                  />
                </div>
                {stockageOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePalier(idx)}
                    className="p-1 text-xs text-[var(--danger)] hover:opacity-80"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
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
                className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
