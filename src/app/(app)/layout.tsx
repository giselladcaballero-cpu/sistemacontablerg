import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import SignOutButton from "./sign-out-button";
import ThemeToggle from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/comprobantes", label: "Comprobantes" },
  { href: "/ordenes-pago", label: "Órdenes de Pago" },
  { href: "/terceros", label: "Clientes / Proveedores" },
  { href: "/bancos", label: "Bancos" },
  { href: "/libro-diario", label: "Libro Diario" },
  { href: "/libro-mayor", label: "Libro Mayor" },
  { href: "/iva", label: "Libro IVA" },
  { href: "/retenciones", label: "Retenciones" },
  { href: "/plan-cuentas", label: "Plan de Cuentas" },
];

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
      <aside className="w-60 shrink-0 border-r bg-surface">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold text-ink">{empresa.nombre}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
