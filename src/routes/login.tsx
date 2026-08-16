import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg px-6 text-fg">
      <img
        src="/game/map/sky.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-bg/55" />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <p className="font-display text-sm tracking-wide text-muted">Lumen Hollow</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Keep your best coin runs tied to an account, or play as a guest from the title screen.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/">Back to the hollow</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
