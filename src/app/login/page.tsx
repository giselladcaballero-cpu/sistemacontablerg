"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <div className="w-full max-w-sm rounded-lg border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-ink">Sistema Contable RG</h1>
        <p className="mb-6 text-sm text-ink-soft">
          {mode === "login" ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-ink">Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Ingresar" : "Registrarme"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-sm text-ink-soft hover:text-ink"
        >
          {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
        </button>
      </div>
    </div>
  );
}
