import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Article } from "@/lib/types";
import ArticlesList from "./ArticlesList";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

async function getArticles(): Promise<Article[]> {
  const clientId = process.env.DASHBOARD_CLIENT_ID;
  if (!clientId) {
    throw new Error("DASHBOARD_CLIENT_ID non configuré.");
  }

  const { data, error } = await supabaseAdmin
    .from("catalogue_articles")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getArticles error:", error);
    return [];
  }

  return data as Article[];
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] text-[var(--text-dim)]">
            DHA
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Catalogue d&apos;articles
          </h1>
        </div>
        <LogoutButton />
      </header>

      <ArticlesList initialArticles={articles} />
    </main>
  );
}
