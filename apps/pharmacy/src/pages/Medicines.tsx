export default function MedicinesPage() {
  return (
    <div className="min-h-screen bg-bone p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-medium text-ink text-2xl tracking-tight">Medicines</h1>
        <button className="inline-flex items-center justify-center h-10 rounded-md bg-rx px-4 text-sm font-medium uppercase tracking-wider text-paper hover:bg-rx-dark transition-colors">
          + Add Medicine
        </button>
      </div>
      <p className="text-ink/40 text-sm">No medicines added yet</p>
    </div>
  )
}
