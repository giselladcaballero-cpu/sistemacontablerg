"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/contabilidad", label: "Asientos" },
  { href: "/contabilidad/mayor", label: "Libro Mayor" },
  { href: "/contabilidad/balance", label: "Balance de Sumas y Saldos" },
];

export default function ContabilidadTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-line">
      {TABS.map((tab) => {
        const activo =
          tab.href === "/contabilidad" ? pathname === "/contabilidad" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm ${
              activo
                ? "border-accent font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
