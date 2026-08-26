"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", num: "01", label: "Resumen" },
  { href: "/comprobantes", num: "02", label: "Comprobantes" },
  { href: "/ordenes-pago", num: "03", label: "Órdenes de Pago" },
  { href: "/terceros", num: "04", label: "Clientes / Proveedores" },
  { href: "/bancos", num: "05", label: "Bancos" },
  { href: "/conciliaciones", num: "06", label: "Conciliaciones" },
  { href: "/contabilidad", num: "07", label: "Contabilidad" },
  { href: "/iva", num: "08", label: "Libro IVA" },
  { href: "/retenciones", num: "09", label: "Retenciones" },
  { href: "/vencimientos", num: "10", label: "Vencimientos Impositivos" },
  { href: "/plan-cuentas", num: "11", label: "Plan de Cuentas" },
  { href: "/perfil", num: "12", label: "Perfil del Cliente" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-px overflow-y-auto py-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2.5 px-5 py-[9px] text-[13px] ${
              active ? "bg-accent/[.08] text-accent" : "text-ink-2 hover:text-ink"
            }`}
          >
            {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
            <span className="w-[18px] text-center font-mono text-[12px]">{item.num}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
