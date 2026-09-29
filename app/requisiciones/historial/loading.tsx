export default function CargandoHistorial() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      <div className="h-7 w-64 rounded bg-gray-200" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-36 rounded-full bg-gray-200" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-20 w-full bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
