# Sistema Contable RG

Sistema contable para Argentina, compartido entre 2 personas vía este repositorio + una base de datos Supabase común.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** (Postgres + Auth) como base de datos compartida en la nube
- Proyecto Supabase: `sistema-contable-rg` (org `rodrigoaaaatimoner-droid's Org`, región `sa-east-1`)

## Cómo arrancar (para la segunda persona)

1. Cloná este repo y entrá a la carpeta.
2. `npm install`
3. Copiá `.env.local.example` a `.env.local` (las credenciales de Supabase ya están ahí, son públicas/anónimas, no secretas).
4. `npm run dev` y abrí `http://localhost:3000`.
5. Pedile a la otra persona que te cree el usuario (ver abajo) o registrate desde `/login` — **ojo**: el envío de emails de confirmación de Supabase free tier está muy limitado (pocos por hora). Si el registro se queda "colgado" al confirmar, avisale a la otra persona para que te confirme el usuario manualmente por SQL en el dashboard de Supabase.

## Qué automatiza el sistema

- **Numeración de comprobantes**: automática por punto de venta + tipo.
- **Cálculo de subtotal/IVA/total**: se recalcula solo al agregar/editar ítems de un comprobante.
- **Asiento contable automático**: al confirmar un comprobante (venta o compra), se genera solo el asiento en el libro diario, con las cuentas correctas (Deudores/Proveedores, Ventas/Compras, IVA Débito/Crédito).
- **Libros y reportes**: Libro Diario, Libro Mayor, Libro IVA Ventas/Compras, saldos bancarios y cuentas corrientes de clientes/proveedores — todo se recalcula solo a partir de los datos cargados (son vistas SQL, no hay que "cerrar" nada a mano).

## Estructura de la base de datos

Ver las migraciones aplicadas al proyecto Supabase (`plan_cuentas`, `terceros`, `comprobantes`, `comprobante_items`, `asientos`, `asiento_lineas`, `cuentas_bancarias`, `movimientos_bancarios`) y las vistas de reportes (`v_libro_diario`, `v_libro_mayor`, `v_libro_iva_ventas`, `v_libro_iva_compras`, `v_saldos_bancarios`, `v_cuenta_corriente_terceros`).

Ambos usuarios autenticados comparten acceso total a los datos (RLS habilitado, política `authenticated_full_access`) — no hay separación por usuario, es una única contabilidad compartida.

## Desarrollo

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # lint
```
