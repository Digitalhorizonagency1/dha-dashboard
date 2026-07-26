'use client';

import React, { useState } from 'react';
import { ArticleEtat, CatalogueArticle, StockageOption } from '@/types/catalogue';
import { saveArticleAction } from '@/actions/catalogue';

interface ArticleFormProps {
  initialArticle?: CatalogueArticle;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ArticleForm({ initialArticle, onSuccess, onCancel }: ArticleFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs de base
  const [nom, setNom] = useState(initialArticle?.nom || '');
  const [categorie, setCategorie] = useState(initialArticle?.categorie || 'Téléphones');
  const [description, setDescription] = useState(initialArticle?.description || '');
  const [sku, setSku] = useState(initialArticle?.sku || '');
  const [devise, setDevise] = useState(initialArticle?.devise || 'FCFA');
  const [couleur, setCouleur] = useState(initialArticle?.couleur || '');
  const [imagesText, setImagesText] = useState(
    initialArticle?.images ? initialArticle.images.join('\n') : ''
  );

  // État & Batterie
  const [etat, setEtat] = useState<ArticleEtat>(initialArticle?.etat || 'neuf');
  const [batteriePct, setBatteriePct] = useState<number | ''>(
    initialArticle?.batterie_pct ?? ''
  );

  // Dynamic Stockage options
  const [stockageOptions, setStockageOptions] = useState<StockageOption[]>(
    initialArticle?.stockage_options && initialArticle.stockage_options.length > 0
      ? initialArticle.stockage_options
      : [{ stockage: '128GB', quantite: 1, prix: 0 }]
  );

  // Calculs en direct
  const prixMinimum = stockageOptions.length > 0
    ? Math.min(...stockageOptions.map(opt => Number(opt.prix) || 0))
    : 0;

  const stockTotal = stockageOptions.reduce((acc, opt) => acc + (Number(opt.quantite) || 0), 0);

  // Handlers pour les paliers de stockage
  const handleAddPalier = () => {
    setStockageOptions([...stockageOptions, { stockage: '256GB', quantite: 1, prix: prixMinimum || 0 }]);
  };

  const handleRemovePalier = (index: number) => {
    setStockageOptions(stockageOptions.filter((_, i) => i !== index));
  };

  const handlePalierChange = (index: number, field: keyof StockageOption, value: string | number) => {
    const updated = [...stockageOptions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setStockageOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Formattage des photos
    const images = imagesText
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const result = await saveArticleAction({
      id: initialArticle?.id,
      nom,
      categorie,
      description,
      sku,
      devise,
      couleur,
      images,
      etat,
      batterie_pct: etat === 'reconditionne' ? Number(batteriePct) : null,
      stockage_options: stockageOptions.map(opt => ({
        stockage: opt.stockage.trim() || 'Standard',
        quantite: Number(opt.quantite) || 0,
        prix: Number(opt.prix) || 0,
      })),
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Erreur lors de l’enregistrement');
      return;
    }

    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-slate-200 max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">
          {initialArticle?.id ? 'Modifier l’article' : 'Ajouter un article au catalogue'}
        </h2>
        <p className="text-sm text-slate-500">
          Configurez le modèle, l’état physique et les déclinaisons de prix par stockage.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Informations Générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit *</label>
          <input
            type="text"
            required
            placeholder="ex: iPhone 13"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie *</label>
          <input
            type="text"
            required
            placeholder="ex: Téléphones"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
          />
        </div>
      </div>

      {/* État & Batterie (SECTION CLÉ) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">État du Produit</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition *</label>
            <select
              value={etat}
              onChange={(e) => {
                const newEtat = e.target.value as ArticleEtat;
                setEtat(newEtat);
                if (newEtat === 'neuf') setBatteriePct('');
                else if (!batteriePct) setBatteriePct(85);
              }}
              className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
            >
              <option value="neuf">✨ Neuf</option>
              <option value="reconditionne">🔄 Reconditionné</option>
            </select>
          </div>

          {etat === 'reconditionne' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Batterie (%) <span className="text-red-500">* Obligatoire</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                placeholder="ex: 88"
                value={batteriePct}
                onChange={(e) => setBatteriePct(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-semibold text-emerald-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* Paliers de Stockage & Prix (SECTION DYNAMIQUE) */}
      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Paliers de Stockage, Stocks & Prix</h3>
            <p className="text-xs text-indigo-600">Définissez chaque capacité avec sa quantité et son prix propre.</p>
          </div>
          <button
            type="button"
            onClick={handleAddPalier}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            + Ajouter un palier
          </button>
        </div>

        {stockageOptions.map((opt, index) => (
          <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white p-3 rounded-lg border border-indigo-200">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Capacité</label>
              <input
                type="text"
                placeholder="ex: 128GB"
                required
                value={opt.stockage}
                onChange={(e) => handlePalierChange(index, 'stockage', e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded text-sm text-slate-800"
              />
            </div>

            <div className="w-1/2 md:w-1/4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Stock disponible</label>
              <input
                type="number"
                min="0"
                required
                value={opt.quantite}
                onChange={(e) => handlePalierChange(index, 'quantite', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border rounded text-sm text-slate-800"
              />
            </div>

            <div className="w-1/2 md:w-1/3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Prix ({devise})</label>
              <input
                type="number"
                min="0"
                required
                value={opt.prix}
                onChange={(e) => handlePalierChange(index, 'prix', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border rounded text-sm font-bold text-slate-800"
              />
            </div>

            {stockageOptions.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePalier(index)}
                className="mt-5 text-red-500 hover:text-red-700 p-1 text-sm font-bold"
                title="Supprimer ce palier"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-between items-center text-xs text-slate-600 bg-white p-2.5 rounded-lg border">
          <span>Stock total calculé : <strong>{stockTotal} unités</strong></span>
          <span>Prix à partir de : <strong className="text-indigo-600 text-sm">{prixMinimum.toLocaleString()} {devise}</strong></span>
        </div>
      </div>

      {/* Couleurs (Informatif seulement) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Couleurs disponibles <span className="text-xs text-slate-400 font-normal">(Informatif, affiché si le client demande)</span>
        </label>
        <input
          type="text"
          placeholder="ex: Noir, Blanc, Bleu, Rouge"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg outline-none text-slate-800 text-sm"
        />
      </div>

      {/* Description & URLs Images */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          rows={3}
          placeholder="Afficheur 6.1 pouces, Puce A15 Bionic..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg outline-none text-slate-800 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          URLs des photos <span className="text-xs text-slate-400 font-normal">(Une par ligne - Représentatives du modèle)</span>
        </label>
        <textarea
          rows={3}
          placeholder="https://example.com/iphone13-1.jpg&#10;https://example.com/iphone13-2.jpg"
          value={imagesText}
          onChange={(e) => setImagesText(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg font-mono text-xs outline-none text-slate-700"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer dans le catalogue'}
        </button>
      </div>
    </form>
  );
}
