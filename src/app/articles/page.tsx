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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--accent)]">
            DHA
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-3xl italic">
            Catalogue d&apos;articles
          </h1>
        </div>
        <LogoutButton />
      </header>

      <ArticlesList initialArticles={articles} />
    </main>
  );
}
