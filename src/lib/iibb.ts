// Alícuotas estándar de retención de Ingresos Brutos usadas en la práctica en las distintas
// jurisdicciones (ARBA, AGIP, etc.). No son un valor fijo "vigente para siempre": desde la RN
// 38/2025, ARBA le asigna a cada CUIT una alícuota personalizada mes a mes (26 grupos, 0% a 2,5%;
// 4% si no tiene alícuota asignada, 0,75% si hay imposibilidad técnica de consulta), consultable
// en su padrón online. Elegí acá el valor que le corresponda a cada proveedor según lo consultado.
export const TASAS_IIBB = [
  0, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8,
];
