export default function PageTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`border-l-4 border-accent pl-3 text-lg font-semibold leading-tight text-ink ${className}`}
    >
      {children}
    </h1>
  );
}
