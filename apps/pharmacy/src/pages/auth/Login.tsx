import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PhoneSchema } from '@pharmabridge/types'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import type { UserProfile } from '@pharmabridge/types'

const phoneStep = z.object({ phone: PhoneSchema })
const otpStep   = z.object({ otp: z.string().length(6, 'Enter 6-digit OTP') })
type PhoneForm = z.infer<typeof phoneStep>
type OtpForm   = z.infer<typeof otpStep>

export default function LoginPage() {
  const [step, setStep]     = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone]   = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneStep) })
  const otpForm   = useForm<OtpForm>({ resolver: zodResolver(otpStep) })

  const onSendOtp = async (data: PhoneForm) => {
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/send-otp', { phone: data.phone })
      setPhone(data.phone)
      setStep('otp')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async (data: OtpForm) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{
        data: { user: UserProfile; accessToken: string }
      }>('/auth/verify-otp', { phone, otp: data.otp })

      const { user, accessToken } = res.data.data

      if (user.role !== 'PHARMACY_OWNER') {
        setError('This panel is for pharmacy owners only.')
        return
      }

      const pharmacyId = (user as { pharmacyId?: string }).pharmacyId ?? ''
      setAuth(user, accessToken, pharmacyId)
      navigate('/dashboard', { replace: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-paper border border-line rounded-2xl p-8 shadow-soft">
        <p className="font-display font-semibold text-ink text-2xl tracking-tight mb-1">PharmaBridge</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-rx mb-6">Pharmacy Panel</p>
        <p className="text-ink/50 text-sm mb-8">
          {step === 'phone'
            ? 'Sign in with your registered mobile number'
            : `OTP sent to +91 ${phone}`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <div className="flex items-center gap-2 bg-paper border border-line rounded-lg px-4 py-3 focus-within:border-rx transition-colors">
              <span className="text-ink/40 text-sm font-mono shrink-0">+91</span>
              <div className="w-px h-4 bg-line shrink-0" />
              <input
                {...phoneForm.register('phone')}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none font-mono tracking-widest text-sm"
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="text-xs text-danger">{phoneForm.formState.errors.phone.message}</p>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-rx text-paper text-sm font-medium uppercase tracking-wider hover:bg-rx-dark transition-colors disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerify)} className="space-y-4">
            <input
              {...otpForm.register('otp')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              className="w-full bg-paper border border-line focus:border-rx text-ink placeholder-ink/20 rounded-lg px-4 py-3 outline-none transition-colors font-mono tracking-[0.5em] text-center text-lg"
            />
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-danger text-center">{otpForm.formState.errors.otp.message}</p>
            )}
            {error && <p className="text-xs text-danger text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-rx text-paper text-sm font-medium uppercase tracking-wider hover:bg-rx-dark transition-colors disabled:opacity-40"
            >
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setError(null) }}
              className="w-full text-ink/40 hover:text-ink/70 text-sm transition-colors"
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
