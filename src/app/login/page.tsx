'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Format phone number as user types
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Extract just the numbers
    const phoneNumbers = phone.replace(/\D/g, '')

    if (phoneNumbers.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumbers }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code')
        setLoading(false)
        return
      }

      // Store phone for verification page
      sessionStorage.setItem('pendingPhone', phoneNumbers)
      router.push('/verify')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to GiftWishList</h1>
            <p className="text-gray-600">Enter your phone number to sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                autoFocus
                className="text-lg h-12"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700"
            >
              {loading ? 'Sending code...' : 'Send verification code'}
            </Button>
          </form>

          <p className="text-center text-gray-500 text-sm">
            You&apos;ll receive a text message with a verification code
          </p>
        </div>
      </main>
    </div>
  )
}
