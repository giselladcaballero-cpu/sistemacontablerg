import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import SignOutButton from "./sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/comprobantes", label: "Comprobantes" },
  { href: "/terceros", label: "Clientes / Proveedores" },
  { href: "/bancos", label: "Bancos" },
  { href: "/libro-diario", label: "Libro Diario" },
  { href: "/libro-mayor", label: "Libro Mayor" },
  { href: "/iva", label: "Libro IVA" },
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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 shrink-0 border-r bg-white">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">{empresa.nombre}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
