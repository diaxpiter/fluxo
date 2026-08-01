import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { cardClass, fieldClass, btnPrimaryClass } from "@/lib/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-emerald-500">.</span>fluxo
          </h1>
          <p className="mt-2 text-sm text-foreground/50">Create your account</p>
        </div>

        {message === "check-email" ? (
          <div className={`${cardClass} p-6 text-center text-sm`}>
            <p>Almost there — we sent a confirmation link to your email.</p>
            <p className="mt-2 text-foreground/50">Click it, then come back and log in.</p>
          </div>
        ) : (
          <form action={signup} className={`${cardClass} flex flex-col gap-4 p-6`}>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="displayName" className="text-sm font-medium text-foreground/70">
                Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                autoComplete="name"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground/70">
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground/70">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <button type="submit" className={`${btnPrimaryClass} mt-2`}>
              Sign up
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
