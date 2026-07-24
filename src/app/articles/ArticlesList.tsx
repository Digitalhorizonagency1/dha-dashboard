"use client";

import { useState } from "react";
import type { Article } from "@/lib/types";
import ArticleForm from "./ArticleForm";

function stockLevel(stock: number): "ok" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock < 3) return "low";
  return "ok";
}

const stockStyles: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: "var(--ok-soft)", text: "var(--ok)", label: "En stock" },
  low: { bg: "var(--warn-soft)", text: "var(--warn)", label: "Stock faible" },
  out: { bg: "var(--danger-soft)", text: "var(--danger)", label: "Épuisé" },
};

export default function ArticlesList({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const visibleArticles = articles.filter((a) => showInactive || a.actif);

  function handleSaved(updated: Article, isNew: boolean) {
    setArticles((prev) =>
      isNew ? [updated, ...prev] : prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setEditing(null);
    setCreating(false);
  }

  function handleDeactivated(id: string) {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, actif: false } : a)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Afficher les articles désactivés
        </label>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
        >
          + Ajouter un article
        </button>
      </div>

      {visibleArticles.length === 0 && (
        <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-16 text-center">
          <span className="font-[family-name:var(--font-display)] text-lg italic text-[var(--text-dim)]">
            Le rayon est vide
          </span>
          <p className="text-sm text-[var(--text-dim)]">
            Ajoutez votre premier article avec le bouton ci-dessus.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleArticles.map((article) => {
          const level = stockLevel(article.stock);
          const style = stockStyles[level];
          return (
            <button
              key={article.id}
              onClick={() => setEditing(article)}
              className="card group flex flex-col overflow-hidden text-left hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-card)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-card)";
              }}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[var(--accent-soft)]">
                {article.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.images[0]}
                    alt={article.nom}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--accent)]">
                    <span className="text-3xl">📷</span>
                    <span className="text-xs text-[var(--text-dim)]">Pas de photo</span>
                  </div>
                )}

                <span
                  className="absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: style.bg, color: style.text }}
                >
                  {style.label} ({article.stock})
                </span>

                {!article.actif && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--text)] px-2.5 py-1 text-xs font-medium text-white">
                    Désactivé
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  {article.nom}
                </span>

                {(article.marque || article.couleur) && (
                  <div className="flex flex-wrap gap-1.5">
                    {article.marque && (
                      <span className="rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-xs text-[var(--text-dim)]">
                        {article.marque}
                      </span>
                    )}
                    {article.couleur && (
                      <span className="rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-xs text-[var(--text-dim)]">
                        {article.couleur}
                      </span>
                    )}
                  </div>
                )}

                <span className="mt-auto pt-2 font-[family-name:var(--font-mono)] text-base">
                  {article.prix.toLocaleString("fr-FR")} {article.devise}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {(editing || creating) && (
        <ArticleForm
          article={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={handleSaved}
          onDeactivated={handleDeactivated}
        />
      )}
    </div>
  );
}
