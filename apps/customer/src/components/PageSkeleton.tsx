export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Navbar skeleton */}
      <div className="h-[72px] border-b border-line px-6 flex items-center gap-4">
        <div className="w-36 h-5 skeleton rounded-md" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-md" />
        <div className="w-24 h-9 skeleton rounded-md" />
      </div>
      {/* Hero skeleton */}
      <div className="flex-1 hero-gradient p-8 space-y-6 flex flex-col items-center justify-center">
        <div className="h-12 w-80 skeleton rounded-md" />
        <div className="h-8 w-64 skeleton rounded-md" />
        <div className="h-5 w-96 skeleton rounded-md" />
        <div className="h-12 w-full max-w-md skeleton rounded-md" />
      </div>
      {/* Feature cards skeleton */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
