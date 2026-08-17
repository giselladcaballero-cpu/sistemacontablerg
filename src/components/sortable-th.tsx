"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SortableTh({
  field,
  children,
  right,
  center,
  defaultDir = "asc",
}: {
  field: string;
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  defaultDir?: "asc" | "desc";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  const dir = searchParams.get("dir") ?? "asc";
  const active = sort === field;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.set("dir", dir === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
      params.set("dir", defaultDir);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <th
      onClick={toggle}
      className={`cursor-pointer select-none whitespace-nowrap border-b border-line px-3 py-2 text-[10px] font-medium uppercase tracking-[.05em] text-ink-3 hover:text-accent ${
        right ? "text-right" : center ? "text-center" : "text-left"
      }`}
    >
      {children}
      <span className={`ml-1 ${active ? "text-accent" : "text-ink-3/40"}`}>
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </th>
  );
}
