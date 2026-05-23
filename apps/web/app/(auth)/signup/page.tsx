"use client";

// apps/web/app/(auth)/signup/page.tsx
//
// Sign-up page. Client component for the same reasons as /login. Zod is the
// single source of truth for validation; `name` is enforced client-side
// because `users.name` is nullable in DB (OAuth providers may not return a
// name) but every interactive signup must provide one.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";
import { Card } from "@modulo/ui/components/card";
import { Input } from "@modulo/ui/components/input";

import { GithubLogo, GoogleLogo } from "../brand-logos";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    setLoading(true);
    const { error: authError } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });
    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Sign up failed");
      return;
    }

    router.push("/dashboard");
  }

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setLoading(true);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
    if (authError) {
      setLoading(false);
      setError(authError.message ?? "OAuth sign in failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-0 px-6">
      <div className="flex w-full max-w-md flex-col items-center">
        <h1 className="text-3xl font-medium tracking-tight text-text-primary">
          Modulo
        </h1>
        <div className="my-6 h-px w-10 bg-border-subtle" />

        <Card className="w-full p-8">
          <h2 className="text-xl text-text-primary">Create your account</h2>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuth("github")}
              disabled={loading}
            >
              <GithubLogo className="size-4" />
              Continue with GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuth("google")}
              disabled={loading}
            >
              <GoogleLogo className="size-4" />
              Continue with Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 border-t border-border-subtle" />
            <span className="text-2xs uppercase tracking-wide text-text-tertiary">
              or continue with email
            </span>
            <div className="h-px flex-1 border-t border-border-subtle" />
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm text-text-secondary">
                Name
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm text-text-secondary">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm text-text-secondary">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-sm text-text-tertiary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
