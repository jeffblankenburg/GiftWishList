'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('pendingPhone')
    if (!storedPhone) {
      router.push('/login')
      return
    }
    setPhone(storedPhone)
    inputRefs.current[0]?.focus()
  }, [router])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (value && index === 5) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        handleVerify(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      handleVerify(pasted)
    }
  }

  const handleVerify = async (verificationCode: string) => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+1${phone}`,
        token: verificationCode,
        type: 'sms',
      })

      if (error) {
        setError(error.message)
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setLoading(false)
        return
      }

      // Success - redirect to home
      sessionStorage.removeItem('pendingPhone')
      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
      } else {
        setError('')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Failed to resend code')
    }

    setResending(false)
  }

  const formatPhoneDisplay = (p: string) => {
    const numbers = p.replace(/\D/g, '').slice(-10)
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Enter verification code</h1>
            <p className="text-gray-600">
              We sent a code to {phone && formatPhoneDisplay(phone)}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className="w-12 h-14 text-center text-2xl font-bold bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {loading && (
              <p className="text-rose-600 text-sm text-center">Verifying...</p>
            )}
          </div>

          <div className="text-center space-y-4">
            <button
              onClick={handleResend}
              disabled={resending || loading}
              className="text-rose-600 hover:text-rose-700 disabled:text-gray-400 text-sm font-medium"
            >
              {resending ? 'Sending...' : "Didn't receive the code? Resend"}
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('pendingPhone')
                router.push('/login')
              }}
              className="block w-full text-gray-500 hover:text-gray-600 text-sm"
            >
              Use a different phone number
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
