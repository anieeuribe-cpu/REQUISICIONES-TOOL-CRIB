export default function CargandoHistorial() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-6 w-56 rounded bg-gray-200" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-32 rounded-full bg-gray-200" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-16 w-full bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
