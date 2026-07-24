"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-dim)] transition-colors hover:border-[var(--text)] hover:text-[var(--text)]"
    >
      Se déconnecter
    </button>
  );
}
