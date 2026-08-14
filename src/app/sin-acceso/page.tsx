import SignOutButton from "../(app)/sign-out-button";
import PageTitle from "@/components/page-title";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-surface p-8 text-center shadow-sm">
        <PageTitle className="mx-auto inline-block text-left">Sin acceso a ninguna empresa</PageTitle>
        <p className="text-sm text-ink-soft">
          Tu usuario todavía no fue vinculado a ninguna empresa. Pedile al administrador que te
          dé de alta.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
