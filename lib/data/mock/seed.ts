import type { Aprobador, ParteCatalogo, TipoCambio, UsuarioRol } from "@/lib/types";

const LOCALIDADES = ["A-12", "B-04", "C-21", "D-07", "E-15", "F-03"];
const MAQUINAS_DESC = [
  "Rodamiento", "Banda transportadora", "Filtro de aire", "Sensor fotoelectrico",
  "Motor 1/2 HP", "Valvula solenoide", "Empaque", "Manguera hidraulica",
  "Contactor", "Guante de nitrilo", "Broca HSS", "Tornillo hex", "Lubricante", "Fusible"
];

function buildCatalog(): ParteCatalogo[] {
  const partes: ParteCatalogo[] = [];
  const prefijosUS = ["US", "AM", "NA"];
  const prefijosMX = ["MX", "LA"];

  let n = 0;
  for (const prefijo of [...prefijosUS, ...prefijosMX]) {
    const esAmericana = prefijosUS.includes(prefijo);
    for (let i = 1; i <= 60; i++) {
      n++;
      const numeroParte = `${prefijo}-${String(i).padStart(5, "0")}`;
      const desc = MAQUINAS_DESC[n % MAQUINAS_DESC.length];
      partes.push({
        numeroParte,
        descripcion: `${desc} ${numeroParte}`,
        origen: esAmericana ? "Americana" : "Mexicana",
        costo: Math.round((5 + ((n * 37) % 480)) * 100) / 100,
        localidad: LOCALIDADES[n % LOCALIDADES.length]!,
        activo: true
      });
    }
  }
  return partes;
}

export const CATALOGO_SEED: ParteCatalogo[] = buildCatalog();

// Refleja la estructura real (ver conversación): dos Supervisores en
// Mantenimiento (cualquiera puede aprobar), y combinaciones nivel+área que
// a propósito NO existen todavía (Mantenimiento+Gerente, Producción+
// Superintendente) para poder probar el respaldo de
// lib/business.ts#elegirAprobadorCorreos.
export const APROBADORES_SEED: Aprobador[] = [
  { rol: "Supervisor", nombreCompleto: "Jorge L. Valles", correo: "jorge.valles@empresa.com", activo: true, area: "Mantenimiento" },
  { rol: "Supervisor", nombreCompleto: "Juan M. Ogaz", correo: "juan.ogaz@empresa.com", activo: true, area: "Mantenimiento" },
  { rol: "Supervisor", nombreCompleto: "Sergio A. Gonzalez", correo: "sergio.gonzalez@empresa.com", activo: true, area: "Producción" },
  { rol: "Superintendente", nombreCompleto: "Genaro Lopez", correo: "genaro.lopez@empresa.com", activo: true, area: "Mantenimiento" },
  { rol: "Gerente", nombreCompleto: "Manuel Dominguez", correo: "manuel.dominguez@empresa.com", activo: true, area: "Producción" }
];

export const TIPO_CAMBIO_SEED: TipoCambio = {
  fecha: new Date().toISOString().slice(0, 10),
  valorMXNporUSD: 18.5,
  vigente: true
};

export const ROLES_SEED: UsuarioRol[] = [
  { correo: "empleado.toolcrib@empresa.com", esAlmacen: false, esToolCrib: true, activo: true },
  { correo: "almacen@empresa.com", esAlmacen: true, esToolCrib: false, activo: true },
  { correo: "anieeuribe@gmail.com", esAlmacen: true, esToolCrib: true, activo: true }
];
