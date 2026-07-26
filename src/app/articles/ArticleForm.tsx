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
  etat?: "neuf" | "reconditionne";
}

type Props = {
  article: Article | null;
  onClose: () => void;
  onSaved: (article: Article, isNew: boolean) => void;
  onDeactivated: (id: string) => void;
};

const CHINESE_BRANDS = ["Xiaomi", "Redmi", "Oppo", "Realme", "Vivo", "Huawei", "Chinoise"];

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

  // Activation des états : Neuf et/ou Reconditionné
  const initialHasNeuf = article ? article.etat === "neuf" || article.etat === "les_deux" || !article.etat : true;
  const initialHasRecond = article ? article.etat === "reconditionne" || article.etat === "les_deux" : false;

  const [hasNeuf, setHasNeuf] = useState<boolean>(initialHasNeuf);
  const [hasReconditionne, setHasReconditionne] = useState<boolean>(initialHasRecond);

  // Batterie (%) si Reconditionné
  const [batteriePct, setBatteriePct] = useState<number | "">(
    article?.batterie_pct ?? 85
  );

  // Parsing initial des paliers
  const allInitialOptions: StockageOption[] =
    article?.stockage_options &&
    Array.isArray(article.stockage_options) &&
    article.stockage_options.length > 0
      ? (article.stockage_options as StockageOption[])
      : [];

  const initialNeufOptions = allInitialOptions.filter((o) => o.etat !== "reconditionne");
  const initialRecondOptions = allInitialOptions.filter((o) => o.etat === "reconditionne");

  const [neufOptions, setNeufOptions] = useState<StockageOption[]>(
    initialNeufOptions.length > 0
      ? initialNeufOptions
      : [{ stockage: "128GB", prix: article?.prix || 0, quantite: article?.stock || 1, etat: "neuf" }]
  );

  const [recondOptions, setRecondOptions] = useState<StockageOption[]>(
    initialRecondOptions.length > 0
      ? initialRecondOptions
      : [{ stockage: "128GB", prix: article?.prix ? Math.round(article.prix * 0.8) : 0, quantite: 1, etat: "reconditionne" }]
  );

  const [images, setImages] = useState<string[]>(article?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  // Handlers Neuf
  const handleAddNeuf = () => {
    setNeufOptions((prev) => [...prev, { stockage: "", prix: 0, quantite: 1, etat: "neuf" }]);
  };

  const handleRemoveNeuf = (idx: number) => {
    if (neufOptions.length > 1) {
      setNeufOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleNeufChange = (idx: number, field: keyof StockageOption, value: string | number) => {
    setNeufOptions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Handlers Reconditionné
  const handleAddRecond = () => {
    setRecondOptions((prev) => [...prev, { stockage: "", prix: 0, quantite: 1, etat: "reconditionne" }]);
  };

  const handleRemoveRecond = (idx: number) => {
    if (recondOptions.length > 1) {
      setRecondOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleRecondChange = (idx: number, field: keyof StockageOption, value: string | number) => {
    setRecondOptions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasNeuf && !hasReconditionne) {
      setError("Veuillez cocher au moins un état (Neuf ou Reconditionné).");
      return;
    }

    setSaving(true);

    // Rassemblement des paliers actifs
    const combinedOptions: StockageOption[] = [];
    if (hasNeuf) {
      combinedOptions.push(...neufOptions.map((o) => ({ ...o, etat: "neuf" as const })));
    }
    if (hasReconditionne) {
      combinedOptions.push(...recondOptions.map((o) => ({ ...o, etat: "reconditionne" as const })));
    }

    const prixMin =
      combinedOptions.length > 0
        ? Math.min(...combinedOptions.map((o) => Number(o.prix) || 0))
        : input.prix;

    const stockTotal = combinedOptions.reduce(
      (acc, o) => acc + (Number(o.quantite) || 0),
      0
    );

    const etatCalculated =
      hasNeuf && hasReconditionne
        ? "les_deux"
        : hasReconditionne
        ? "reconditionne"
        : "neuf";

    const marqueLower = input.marque.toLowerCase();
    const estChinoise = CHINESE_BRANDS.some((b) => marqueLower.includes(b.toLowerCase()));

    const payload: ArticleInput & Record<string, unknown> = {
      ...input,
      prix: prixMin,
      stock: stockTotal,
      etat: etatCalculated,
      batterie_pct: hasReconditionne ? Number(batteriePct) || 85 : null,
      stockage_options: combinedOptions.map((opt) => ({
        stockage: opt.stockage.trim() || "Standard",
        prix: Number(opt.prix) || 0,
        quantite: Number(opt.quantite) || 0,
        etat: opt.etat || "neuf",
      })),
      attributs: {
        ...(article?.attributs || {}),
        marque: input.marque,
        est_chinoise: estChinoise || marqueLower.includes("chinoise"),
      },
    };

    const result = isNew
      ? await createArticle(payload as ArticleInput)
      : await updateArticle(article!.id!, payload as ArticleInput);

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
        etat: etatCalculated,
        batterie_pct: hasReconditionne ? Number(batteriePct) || 85 : null,
        stockage_options: combinedOptions,
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
      {/* Modale élargie (max-w-2xl) */}
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            {isNew ? "Nouvel article" : "Modifier l'article"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[var(--text-dim)] hover:text-[var(--text)] text-lg"
          >
            ✕
          </button>
        </div>

        {!isNew && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[var(--text-dim)]">Photos</span>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 font-medium"
                  >
                    Retirer
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs font-medium text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
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
          <p className="rounded-lg bg-[var(--bg-input)] p-3 text-xs text-[var(--text-dim)] border border-[var(--border)]">
            Enregistrez d&apos;abord l&apos;article pour pouvoir y ajouter des photos.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nom du produit" required>
            <input
              required
              placeholder="ex: iPhone 13, Redmi Note 12..."
              value={input.nom}
              onChange={(e) => updateField("nom", e.target.value)}
              className="input text-base font-medium"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Catégorie" required>
              <input
                required
                placeholder="ex: smartphone"
                value={input.categorie}
                onChange={(e) => updateField("categorie", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Marque">
              <input
                placeholder="ex: Apple, Xiaomi, Redmi, Oppo..."
                value={input.marque}
                onChange={(e) => updateField("marque", e.target.value)}
                className="input"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-[var(--text-dim)] self-center mr-1">Ajouter marque chinoise:</span>
                {CHINESE_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      if (!input.marque.toLowerCase().includes(b.toLowerCase())) {
                        updateField("marque", input.marque ? `${input.marque}, ${b}` : b);
                      }
                    }}
                    className="rounded bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    + {b}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Couleur(s) disponible(s)">
              <input
                placeholder="ex: Noir, Bleu, Or"
                value={input.couleur}
                onChange={(e) => updateField("couleur", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Devise">
              <input
                value={input.devise}
                onChange={(e) => updateField("devise", e.target.value)}
                className="input font-medium"
              />
            </Field>
          </div>

          {/* SÉLECTION DES ÉTATS (NEUF ET/OU RECONDITIONNÉ SIMULTANÉMENT) */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Disponibilité & État du produit
            </span>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasNeuf}
                  onChange={(e) => setHasNeuf(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                ✨ Disponible en NEUF
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasReconditionne}
                  onChange={(e) => setHasReconditionne(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                🔄 Disponible en RECONDITIONNÉ
              </label>
            </div>

            {hasReconditionne && (
              <div className="mt-2 pt-3 border-t border-[var(--border)] flex items-center gap-3">
                <Field label="Santé Batterie pour Reconditionné (%)" required>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required={hasReconditionne}
                    placeholder="ex: 88"
                    value={batteriePct}
                    onChange={(e) =>
                      setBatteriePct(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="input w-32 font-bold text-[var(--accent)] text-center text-base"
                  />
                </Field>
                <span className="text-xs text-[var(--text-dim)] mt-4">
                  (Batterie certifiée pour l&apos;exemplaire reconditionné)
                </span>
              </div>
            )}
          </div>

          {/* PALIERS DE STOCKAGE & PRIX POUR LE NEUF */}
          {hasNeuf && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  ✨ Capacités & Prix (Article NEUF)
                </span>
                <button
                  type="button"
                  onClick={handleAddNeuf}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  + Ajouter un stockage neuf
                </button>
              </div>

              {neufOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-sm">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Stockage
                    </label>
                    <input
                      placeholder="ex: 128GB"
                      required
                      value={opt.stockage}
                      onChange={(e) => handleNeufChange(idx, "stockage", e.target.value)}
                      className="input text-xs w-full"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Prix ({input.devise})
                    </label>
                    <input
                      type="number"
                      placeholder="Prix"
                      required
                      min={0}
                      value={opt.prix || ""}
                      onChange={(e) => handleNeufChange(idx, "prix", Number(e.target.value))}
                      className="input text-xs w-full font-bold"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Stock
                    </label>
                    <input
                      type="number"
                      placeholder="Stock"
                      required
                      min={0}
                      value={opt.quantite}
                      onChange={(e) => handleNeufChange(idx, "quantite", Number(e.target.value))}
                      className="input text-xs w-full"
                    />
                  </div>

                  {neufOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveNeuf(idx)}
                      className="mt-3 p-1 text-xs text-[var(--danger)] hover:opacity-80"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PALIERS DE STOCKAGE & PRIX POUR LE RECONDITIONNÉ */}
          {hasReconditionne && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  🔄 Capacités & Prix (Article RECONDITIONNÉ)
                </span>
                <button
                  type="button"
                  onClick={handleAddRecond}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  + Ajouter un stockage reconditionné
                </button>
              </div>

              {recondOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-sm">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Stockage
                    </label>
                    <input
                      placeholder="ex: 128GB"
                      required
                      value={opt.stockage}
                      onChange={(e) => handleRecondChange(idx, "stockage", e.target.value)}
                      className="input text-xs w-full"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Prix ({input.devise})
                    </label>
                    <input
                      type="number"
                      placeholder="Prix reconditionné"
                      required
                      min={0}
                      value={opt.prix || ""}
                      onChange={(e) => handleRecondChange(idx, "prix", Number(e.target.value))}
                      className="input text-xs w-full font-bold text-[var(--accent)]"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                      Stock
                    </label>
                    <input
                      type="number"
                      placeholder="Stock"
                      required
                      min={0}
                      value={opt.quantite}
                      onChange={(e) => handleRecondChange(idx, "quantite", Number(e.target.value))}
                      className="input text-xs w-full"
                    />
                  </div>

                  {recondOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecond(idx)}
                      className="mt-3 p-1 text-xs text-[var(--danger)] hover:opacity-80"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DESCRIPTION ÉLARGIE */}
          <Field label="Description">
            <textarea
              value={input.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={5}
              placeholder="Spécifications techniques détaillées du téléphone (écran, caméra, processeur...)"
              className="input resize-y min-h-[110px] text-sm"
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
            <p role="alert" className="text-sm text-[var(--danger)] font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
              ⚠️ {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
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
                className="rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 shadow-sm"
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
      <span className="text-[var(--text-dim)] font-medium">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
