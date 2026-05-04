import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/axios'
import { useToastStore } from '../stores/toastStore'

const CATEGORIES = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'POWDER', 'OTHER']

const schema = z.object({
  name:                   z.string().min(2, 'Name is required'),
  genericName:            z.string().optional(),
  manufacturer:           z.string().min(2, 'Manufacturer is required'),
  category:               z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'POWDER', 'OTHER']),
  price:                  z.coerce.number().positive('Price must be positive'),
  stock:                  z.coerce.number().int().nonnegative('Stock cannot be negative'),
  isPrescriptionRequired: z.boolean().default(false),
  description:            z.string().optional(),
})

type FormData = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ink/50 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-bone border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors'

export default function MedicineAddPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const push        = useToastStore((s) => s.push)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'TABLET', isPrescriptionRequired: false, stock: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/medicines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-medicines'] })
      push('success', 'Medicine added')
      navigate('/medicines')
    },
    onError: () => push('error', 'Failed to add medicine'),
  })

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors mb-6">
        <ArrowLeft size={15} /> Medicines
      </button>

      <h1 className="font-display font-semibold text-ink text-2xl tracking-tight mb-6">Add Medicine</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 bg-paper border border-line rounded-2xl p-5">
        <Field label="Medicine Name *" error={errors.name?.message}>
          <input {...register('name')} placeholder="e.g., Paracetamol 500mg" className={inputCls} />
        </Field>

        <Field label="Generic Name" error={errors.genericName?.message}>
          <input {...register('genericName')} placeholder="e.g., Acetaminophen" className={inputCls} />
        </Field>

        <Field label="Manufacturer *" error={errors.manufacturer?.message}>
          <input {...register('manufacturer')} placeholder="e.g., Cipla Ltd" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category *" error={errors.category?.message}>
            <select {...register('category')} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (₹) *" error={errors.price?.message}>
            <input {...register('price')} type="number" step="0.01" placeholder="0.00" className={inputCls} />
          </Field>
        </div>

        <Field label="Stock *" error={errors.stock?.message}>
          <input {...register('stock')} type="number" placeholder="0" className={inputCls} />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register('isPrescriptionRequired')} type="checkbox" className="rounded border-line text-rx" />
          <span className="text-sm text-ink/70">Requires Prescription (Schedule H / H1 / X)</span>
        </label>

        <Field label="Description" error={errors.description?.message}>
          <textarea {...register('description')} rows={3} placeholder="Usage, dosage notes…" className={`${inputCls} resize-none`} />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 rounded-lg bg-rx text-paper text-sm font-medium uppercase tracking-wider hover:bg-rx-dark transition-colors disabled:opacity-40"
        >
          {mutation.isPending ? 'Adding…' : 'Add Medicine'}
        </button>
      </form>
    </div>
  )
}
