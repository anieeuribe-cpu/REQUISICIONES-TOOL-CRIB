export default function CargandoDetalle() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="h-6 w-24 rounded-full bg-gray-200" />
      </div>

      <section className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </section>

      <section className="card p-5">
        <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
        <div className="h-20 w-full rounded bg-gray-100" />
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-4 w-36 rounded bg-gray-200" />
      </section>
    </div>
  );
}
