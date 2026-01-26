import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Normalize to 10 digits
    const phone10 = phone.replace(/\D/g, '').slice(-10)

    if (phone10.length !== 10) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Send the OTP - this will create the auth user if they don't exist
    // signInWithOtp needs + prefix for US numbers
    const { error: otpError } = await adminClient.auth.signInWithOtp({
      phone: `+1${phone10}`,
    })

    if (otpError) {
      console.error('OTP error:', otpError)
      return NextResponse.json({ error: otpError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
  }
}
