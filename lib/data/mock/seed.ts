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

export const APROBADORES_SEED: Aprobador[] = [
  { rol: "Supervisor", nombreCompleto: "Laura Méndez", correo: "laura.mendez@empresa.com", activo: true },
  { rol: "Superintendente", nombreCompleto: "Jorge Salinas", correo: "jorge.salinas@empresa.com", activo: true },
  { rol: "Gerente", nombreCompleto: "Patricia Vega", correo: "patricia.vega@empresa.com", activo: true }
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
