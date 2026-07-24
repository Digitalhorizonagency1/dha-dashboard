import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.3em] text-[var(--text-dim)]">
          DHA
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-xl">
          Catalogue d&apos;articles
        </h1>
      </div>
      <LoginForm />
    </main>
  );
}
