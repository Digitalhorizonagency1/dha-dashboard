"use client";

import React, { useState } from "react";
import type { Article } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StockageOption {
  stockage: string;
  prix: number;
  quantite: number;
}

interface ArticleFormProps {
  article: Article | null;
  onClose: () => void;
  onSaved: (article: Article, isNew: boolean) => void;
  onDeactivated?: (id: string) => void;
}

export default function ArticleForm({
  article,
  onClose,
  onSaved,
  onDeactivated,
}: ArticleFormProps) {
  const isNew = !article?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs de base
  const [nom, setNom] = useState(article?.nom || "");
  const [categorie, setCategorie] = useState(article?.categorie || "smartphone");
  const [marque, setMarque] = useState(article?.marque || (article?.attributs?.marque as string) || "");
  const [couleur, setCouleur] = useState(article?.couleur || "");
  const [devise, setDevise] = useState(article?.devise || "FCFA");
  const [description, setDescription] = useState(article?.description || "");
  
  // Photos
  const [imagesText, setImagesText] = useState(
    article?.images ? article.images.join("\n") : ""
  );

  // Case à cocher Reconditionné
  const [isReconditionne, setIsReconditionne] = useState<boolean>(
    article?.etat === "reconditionne"
  );

  // Pourcentage de Batterie (Uniquement si Reconditionné)
  const [batteriePct, setBatteriePct] = useState<number | "">(
    article?.batterie_pct ?? 85
  );

  // Paliers de Stockage & Prix (Disponibles pour Neuf ET Reconditionné)
  const initialStockage: StockageOption[] = 
    article?.stockage_options && article.stockage_options.length > 0
      ? article.stockage_options
      : [{ stockage: "128GB", prix: article?.prix || 0, quantite: article?.stock || 1 }];

  const [stockageOptions, setStockageOptions] = useState<StockageOption[]>(initialStockage);

  // Calculs dynamiques du prix plancher et du stock total
  const prixMin = stockageOptions.length > 0
    ? Math.min(...stockageOptions.map((o) => Number(o.prix) || 0))
    : Number(article?.prix || 0);

  const stockTotal = stockageOptions.reduce((acc, o) => acc + (Number(o.quantite) || 0), 0);

  const handleAddPalier = () => {
    setStockageOptions([
      ...stockageOptions,
      { stockage: "", prix: prixMin || 0, quantite: 1 },
    ]);
  };

  const handleRemovePalier = (idx: number) => {
    if (stockageOptions.length > 1) {
      setStockageOptions(stockageOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePalierChange = (
    idx: number,
    field: keyof StockageOption,
    value: string | number
  ) => {
    const updated = [...stockageOptions];
    updated[idx] = { ...updated[idx], [field]: value };
    setStockageOptions(updated);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const images = imagesText
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const etat = isReconditionne ? "reconditionne" : "neuf";
      const batterie = isReconditionne ? Number(batteriePct) || 85 : null;

      const cleanedOptions = stockageOptions.map((opt) => ({
        stockage: opt.stockage.trim() || "Standard",
        prix: Number(opt.prix) || 0,
        quantite: Number(opt.quantite) || 0,
      }));

      const payload = {
        nom,
        categorie,
        marque: marque || null,
        couleur: couleur || null,
        devise,
        images,
        description: description || null,
        etat,
        batterie_pct: batterie,
        stockage_options: cleanedOptions,
        prix: prixMin,
        stock: stockTotal,
        actif: article?.actif ?? true,
        attributs: { ...(article?.attributs || {}), marque },
      };

      let resData: Article;

      if (isNew) {
        const { data, error: err } = await supabase
          .from("catalogue_articles")
          .insert(payload)
          .select()
          .single();

        if (err) throw new Error(err.message);
        resData = data as Article;
      } else {
        const { data, error: err } = await supabase
          .from("catalogue_articles")
          .update(payload)
          .eq("id", article.id)
          .select()
          .single();

        if (err) throw new Error(err.message);
        resData = data as Article;
      }

      onSaved(resData, isNew);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isNew ? "Ajouter un article" : "Modifier l'article"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom du produit & Catégorie */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nom du produit *
              </label>
              <input
                type="text"
                required
                placeholder="ex: iPhone 13"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Catégorie *
              </label>
              <input
                type="text"
                required
                placeholder="ex: smartphone"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Marque, Couleur, Devise */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Marque
              </label>
              <input
                type="text"
                placeholder="ex: Apple"
                value={marque}
                onChange={(e) => setMarque(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Couleur(s)
              </label>
              <input
                type="text"
                placeholder="ex: Noir, Bleu"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Devise
              </label>
              <input
                type="text"
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* CASE À COCHER : RECONDITIONNÉ + POURCENTAGE BATTERIE CONDITIONNEL */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reconditionne-toggle"
                checked={isReconditionne}
                onChange={(e) => setIsReconditionne(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label
                htmlFor="reconditionne-toggle"
                className="font-bold text-slate-800 cursor-pointer select-none"
              >
                Cet article est Reconditionné
              </label>
            </div>

            {/* APPARAÎT SEULEMENT SI COCHÉ */}
            {isReconditionne && (
              <div className="pt-3 border-t border-slate-200 bg-amber-50/80 p-3 rounded-lg border border-amber-200 space-y-1">
                <label className="block text-sm font-bold text-amber-900">
                  Pourcentage de la batterie (%) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required={isReconditionne}
                    placeholder="ex: 88"
                    value={batteriePct}
                    onChange={(e) =>
                      setBatteriePct(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-28 rounded-lg border border-slate-300 p-2 text-center text-lg font-bold text-emerald-600 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-amber-800 font-medium">
                    (Pourcentage certifié de la batterie)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PALIERS DE STOCKAGE, PRIX ET STOCKS ASSOCIÉS (NEUF & RECONDITIONNÉ) */}
          <div className="rounded-xl bg-amber-50/40 p-4 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Capacités de Stockage & Prix *
                </h3>
                <p className="text-xs text-slate-500">
                  Associez chaque stockage à son prix et à son stock ({isReconditionne ? 'Reconditionné' : 'Neuf'}).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPalier}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
              >
                + Ajouter une capacité
              </button>
            </div>

            {stockageOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"
              >
                <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">
                    Stockage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 128GB"
                    value={opt.stockage}
                    onChange={(e) => handlePalierChange(idx, "stockage", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">
                    Prix ({devise})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="ex: 245000"
                    value={opt.prix || ""}
                    onChange={(e) => handlePalierChange(idx, "prix", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="w-1/4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">
                    Stock
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="ex: 5"
                    value={opt.quantite}
                    onChange={(e) => handlePalierChange(idx, "quantite", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {stockageOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePalier(idx)}
                    className="mt-3 p-1.5 text-xs font-bold text-red-500 hover:text-red-700"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* URLs Photos */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              URLs des Photos (une par ligne)
            </label>
            <textarea
              rows={2}
              placeholder="https://..."
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Spécifications techniques..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Boutons d'actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {!isNew && onDeactivated && (
              <button
                type="button"
                onClick={() => onDeactivated(article!.id!)}
                className="text-xs text-red-500 hover:underline"
              >
                Désactiver l'article
              </button>
            )}
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
