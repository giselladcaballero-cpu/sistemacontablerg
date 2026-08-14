# Sistema Contable RG

Sistema contable para Argentina, multi-empresa (multi-tenant): un mismo proyecto Supabase
sirve a varias empresas/clientes, con los datos de cada una completamente aislados por RLS.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** (Postgres + Auth) como base de datos compartida en la nube
- Proyecto Supabase: `sistema-contable-rg` (org `rodrigoaaaatimoner-droid's Org`, región `sa-east-1`)

## Modelo multi-empresa (para vender el sistema a otros clientes)

Cada cliente que compra el sistema es una fila en `empresas`. Los usuarios se vinculan a
una o más empresas a través de `empresa_usuarios` (con rol `admin` / `contador` / `lectura`).
Todas las tablas de negocio (`plan_cuentas`, `terceros`, `comprobantes`, `asientos`,
`cuentas_bancarias`, etc.) tienen `empresa_id`, y las políticas RLS solo dejan ver/editar
filas de las empresas a las que el usuario pertenece — un cliente nunca puede ver los datos
de otro, aunque compartan la misma base.

### Dar de alta un cliente nuevo (alta manual, por SQL en Supabase)

1. El usuario nuevo tiene que haberse registrado al menos una vez en `/login` (para que exista
   su fila en `profiles`) — o se lo crea directamente por SQL/Auth Admin.
2. Ejecutar en el SQL Editor del proyecto Supabase:
   ```sql
   select fn_provisionar_empresa('Nombre del Cliente SA', 'email@delcliente.com', '20-12345678-9');
   ```
   Esto crea la empresa, le copia el plan de cuentas estándar (49 cuentas) y, si ya existe un
   usuario con ese email, lo vincula como admin. Si el usuario todavía no se registró, se puede
   correr `fn_agregar_usuario_a_empresa('<empresa_id>', 'email@delcliente.com')` después de que
   se registre.
3. Para sumar más usuarios a una empresa ya creada (ej. un socio, un contador):
   ```sql
   select fn_agregar_usuario_a_empresa('<empresa_id>', 'otro@email.com', 'contador');
   ```
4. Si el registro por `/login` se cuelga por el límite de emails de confirmación de Supabase
   (ver más abajo), confirmar el usuario a mano:
   ```sql
   update auth.users set email_confirmed_at = now() where email = 'email@delcliente.com';
   ```

### Dar de baja un cliente

No hay cascada automática entre las tablas de negocio (a propósito, para no perder datos por
error). Para borrar todo lo de una empresa, borrar en este orden:
`comprobante_items → asiento_lineas → comprobantes → asientos → movimientos_bancarios →
cuentas_bancarias → terceros → plan_cuentas → empresa_usuarios → empresas`.

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
