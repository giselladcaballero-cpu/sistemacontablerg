"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageTitle from "@/components/page-title";
import { Field, Input, Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-surface p-8">
        <PageTitle className="mb-1">Sistema Contable RG</PageTitle>
        <p className="mb-6 text-[12.5px] text-ink-2">
          {mode === "login" ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Nombre">
              <Input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full normal-case" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full normal-case" />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full normal-case"
            />
          </Field>
          {error && <p className="text-[12px] text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? "..." : mode === "login" ? "Ingresar" : "Registrarme"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-[12.5px] text-ink-2 hover:text-ink"
        >
          {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
        </button>
      </div>
    </div>
  );
}
