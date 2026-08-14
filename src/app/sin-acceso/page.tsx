import SignOutButton from "../(app)/sign-out-button";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Sin acceso a ninguna empresa</h1>
        <p className="text-sm text-gray-500">
          Tu usuario todavía no fue vinculado a ninguna empresa. Pedile al administrador que te
          dé de alta.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
