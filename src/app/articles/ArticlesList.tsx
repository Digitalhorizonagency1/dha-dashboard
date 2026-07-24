"use client";

import { useState } from "react";
import type { Article } from "@/lib/types";
import ArticleForm from "./ArticleForm";

function stockLevel(stock: number): "ok" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock < 3) return "low";
  return "ok";
}

const stockColor: Record<string, string> = {
  ok: "var(--accent)",
  low: "var(--warn)",
  out: "var(--danger)",
};

const stockLabel: Record<string, string> = {
  ok: "En stock",
  low: "Stock faible",
  out: "Épuisé",
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Afficher les articles désactivés
        </label>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#04120a] transition-opacity hover:opacity-90"
        >
          + Ajouter un article
        </button>
      </div>

      {visibleArticles.length === 0 && (
        <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-dim)]">
          Aucun article pour l&apos;instant. Ajoutez le premier avec le bouton ci-dessus.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {visibleArticles.map((article) => {
          const level = stockLevel(article.stock);
          return (
            <li
              key={article.id}
              className="flex items-center gap-4 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-raised)]"
              style={{ borderLeftColor: stockColor[level], borderLeftWidth: 4 }}
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden bg-[var(--bg-input)]">
                {article.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.images[0]}
                    alt={article.nom}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-[var(--text-dim)]">Pas de photo</span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-0.5 py-3">
                <span className="font-medium">
                  {article.nom}
                  {!article.actif && (
                    <span className="ml-2 text-xs text-[var(--text-dim)]">(désactivé)</span>
                  )}
                </span>
                <span className="text-sm text-[var(--text-dim)]">
                  {[article.marque, article.couleur, article.categorie]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>

              <div className="flex flex-col items-end gap-0.5 py-3 pr-2 text-right">
                <span className="font-[family-name:var(--font-display)] text-sm">
                  {article.prix.toLocaleString("fr-FR")} {article.devise}
                </span>
                <span
                  className="font-[family-name:var(--font-display)] text-xs"
                  style={{ color: stockColor[level] }}
                >
                  {stockLabel[level]} ({article.stock})
                </span>
              </div>

              <button
                onClick={() => setEditing(article)}
                className="mr-4 flex-shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-dim)] transition-colors hover:border-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Modifier
              </button>
            </li>
          );
        })}
      </ul>

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
