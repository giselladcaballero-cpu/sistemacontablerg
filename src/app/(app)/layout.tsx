import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import SignOutButton from "./sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import SidebarNav from "./sidebar-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const empresa = await getEmpresaActual();
  if (!empresa) redirect("/sin-acceso");

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 flex h-screen w-[222px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 pb-4 pt-5">
          <span className="mb-2 inline-block rounded bg-accent px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[.08em] text-accent-ink">
            RG
          </span>
          <div className="truncate text-[15px] font-semibold leading-tight text-ink">{empresa.nombre}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-ink-2">{user.email}</div>
        </div>

        <SidebarNav />

        <div className="space-y-2 border-t border-line px-[1.1rem] py-[.9rem]">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 pb-12 pt-5">{children}</main>
    </div>
  );
}
