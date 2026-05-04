import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PhoneSchema } from '@pharmabridge/types'

const phoneStep = z.object({ phone: PhoneSchema })
const otpStep   = z.object({ otp: z.string().length(6, 'Enter 6-digit OTP') })
type PhoneForm = z.infer<typeof phoneStep>
type OtpForm   = z.infer<typeof otpStep>

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneStep) })
  const otpForm   = useForm<OtpForm>({ resolver: zodResolver(otpStep) })

  const onSendOtp = (data: PhoneForm) => { setPhone(data.phone); setStep('otp') }
  const onVerify  = (_data: OtpForm) => { /* TODO: call API */ }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-paper border border-line rounded-2xl p-8 shadow-soft">
        <p className="font-display font-medium text-ink text-2xl tracking-tight mb-1">PharmaBridge</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-rx mb-6">Pharmacy Panel</p>
        <p className="text-ink/50 text-sm mb-8">
          {step === 'phone' ? 'Sign in with your registered mobile number' : `OTP sent to +91 ${phone}`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <div className="flex items-center gap-2 bg-paper border border-line rounded-md px-4 py-3 focus-within:border-brand-indigo transition-colors">
              <span className="text-ink/40 text-sm font-mono">+91</span>
              <div className="w-px h-4 bg-line" />
              <input
                {...phoneForm.register('phone')}
                type="tel" inputMode="numeric" maxLength={10}
                placeholder="98765 43210"
                className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none font-mono tracking-widest text-sm"
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="text-xs text-danger">{phoneForm.formState.errors.phone.message}</p>
            )}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center h-11 rounded-md bg-rx px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-rx-dark transition-colors disabled:opacity-40"
            >
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerify)} className="space-y-4">
            <input
              {...otpForm.register('otp')}
              type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •"
              className="w-full bg-paper border border-line focus:border-brand-indigo text-ink placeholder-ink/20 rounded-md px-4 py-3 outline-none transition-colors font-mono tracking-[0.5em] text-center text-lg"
            />
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-danger text-center">{otpForm.formState.errors.otp.message}</p>
            )}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center h-11 rounded-md bg-rx px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-rx-dark transition-colors disabled:opacity-40"
            >
              Verify OTP
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-ink/40 hover:text-ink/70 text-sm transition-colors">
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
