import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--accent)]">
          DHA
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl italic">
          Catalogue d&apos;articles
        </h1>
      </div>
      <LoginForm />
    </main>
  );
}
