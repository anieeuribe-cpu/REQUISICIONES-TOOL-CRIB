/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  // Con el ritmo de despliegues de este proyecto, un navegador que guarda en
  // caché la página por un rato puede abrir una versión vieja que ya no
  // combina con los archivos nuevos del servidor (causa errores raros de
  // React al volver a abrir el link después de tiempo). Se le dice al
  // navegador que nunca guarde el HTML, para que siempre jale la última.
  async headers() {
    return [
      {
        // Todo excepto los archivos estáticos con hash (_next/static) — esos
        // sí deben quedarse con su caché normal, son seguros de cachear
        // porque su nombre cambia solo si su contenido cambia.
        source: "/((?!_next/static).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }]
      }
    ];
  }
};

module.exports = nextConfig;
