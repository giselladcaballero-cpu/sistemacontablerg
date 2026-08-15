import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";

export type Tone = "accent" | "gold" | "good" | "bad" | "plum" | "muted";

const toneText: Record<Tone, string> = {
  accent: "text-accent",
  gold: "text-gold",
  good: "text-good",
  bad: "text-bad",
  plum: "text-plum",
  muted: "text-ink-2",
};
const toneChip: Record<Tone, string> = {
  accent: "bg-accent/15 text-accent",
  gold: "bg-gold/15 text-gold",
  good: "bg-good/15 text-good",
  bad: "bg-bad/15 text-bad",
  plum: "bg-plum/15 text-plum",
  muted: "bg-ink-2/10 text-ink-2",
};
const toneBar: Record<Tone, string> = {
  accent: "bg-accent",
  gold: "bg-gold",
  good: "bg-good",
  bad: "bg-bad",
  plum: "bg-plum",
  muted: "bg-ink-3",
};

export function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[10px] border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[1.15rem] py-3">
          {title && (
            <h2 className="text-[12px] font-medium uppercase tracking-[.07em] text-ink-2">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "accent",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface p-[1.15rem]">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${toneBar[tone]}`} />
      <div className="mb-[7px] text-[11px] uppercase tracking-[.05em] text-ink-2">{label}</div>
      <div className={`whitespace-nowrap font-mono text-[21px] font-semibold ${toneText[tone]}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-2">{sub}</div>}
    </div>
  );
}

export const Badge = ({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`inline-block rounded px-[7px] py-0.5 text-[10px] font-semibold ${toneChip[tone]}`}>
    {children}
  </span>
);

export function Button({
  variant = "secondary",
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const base = "cursor-pointer rounded-[6px] px-[14px] py-[7px] text-[12px] font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "border border-accent bg-accent text-accent-ink hover:border-accent-hover hover:bg-accent-hover"
      : "border border-line-strong bg-surface-2 text-ink hover:border-accent/40 hover:text-accent";
  return <button className={`${base} ${styles} ${className}`} {...p} />;
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1.5 text-[10px] uppercase tracking-[.05em] text-ink-2">
    {label}
    {children}
  </label>
);

export const Input = ({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`rounded-[6px] border border-line-strong bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent ${className}`}
    {...p}
  />
);

export const Select = ({ className = "", ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={`cursor-pointer rounded-[6px] border border-line-strong bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent ${className}`}
    {...p}
  />
);

export const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[12.5px]">{children}</table>
  </div>
);

export const Th = ({
  right,
  center,
  children,
}: {
  right?: boolean;
  center?: boolean;
  children?: ReactNode;
}) => (
  <th
    className={`whitespace-nowrap border-b border-line px-3 py-2 text-[10px] font-medium uppercase tracking-[.05em] text-ink-3 ${
      right ? "text-right" : center ? "text-center" : "text-left"
    }`}
  >
    {children}
  </th>
);

export const Td = ({
  right,
  center,
  mono,
  className = "",
  children,
}: {
  right?: boolean;
  center?: boolean;
  mono?: boolean;
  className?: string;
  children?: ReactNode;
}) => (
  <td
    className={`border-b border-line px-3 py-2 ${right ? "text-right" : center ? "text-center" : ""} ${
      mono ? "font-mono text-[11.5px]" : ""
    } ${className}`}
  >
    {children}
  </td>
);

export const Row = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr onClick={onClick} className={`hover:bg-accent/5 ${onClick ? "cursor-pointer" : ""}`}>
    {children}
  </tr>
);

export const money = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pesos = (n: number) => "$ " + money(n);

export const Money = ({ v, tone }: { v: number; tone?: Tone }) => (
  <span className={`font-mono ${tone ? toneText[tone] : ""}`}>{pesos(v)}</span>
);
