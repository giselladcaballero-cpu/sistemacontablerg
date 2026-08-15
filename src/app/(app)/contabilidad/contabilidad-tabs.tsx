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
    <div className="mb-6 flex gap-1.5 rounded-full bg-surface-2 p-1 [width:fit-content]">
      {TABS.map((tab) => {
        const activo =
          tab.href === "/contabilidad" ? pathname === "/contabilidad" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              activo ? "bg-accent/[.15] text-accent" : "text-ink-2 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
