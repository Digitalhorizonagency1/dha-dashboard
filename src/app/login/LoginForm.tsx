"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      router.push("/articles");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-[var(--text-dim)]">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-[var(--text)] outline-none focus-visible:border-[var(--accent)]"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 font-medium text-[#04120a] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
