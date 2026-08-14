"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-muted"
    >
      Cerrar sesión
    </button>
  );
}
