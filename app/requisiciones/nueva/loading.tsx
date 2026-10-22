export default function CargandoNuevaRequisicion() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      <div className="h-7 w-56 rounded bg-gray-200" />
      <div className="card flex flex-col gap-4 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-100" />
        ))}
      </div>
      <div className="card h-28 w-full bg-gray-100" />
    </div>
  );
}
