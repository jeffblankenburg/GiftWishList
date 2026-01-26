'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { BottomNav } from '@/components/BottomNav'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [originalDisplayName, setOriginalDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setPhone(user.phone || '')

    const { data: profile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name || '')
      setOriginalDisplayName(profile.display_name || '')
    }

    setLoading(false)
  }

  function formatPhone(phone: string) {
    const numbers = phone.replace(/\D/g, '').slice(-10)
    if (numbers.length !== 10) return phone
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)

    if (error) {
      setMessage('Failed to update profile')
    } else {
      setMessage('Profile updated!')
      setOriginalDisplayName(displayName.trim())
      setTimeout(() => setMessage(''), 3000)
    }

    setSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/signout', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const hasChanges = displayName.trim() !== originalDisplayName

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={formatPhone(phone)} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you"
              />
              <p className="text-xs text-gray-500">
                This name will be shown to other group members
              </p>
            </div>

            {message && (
              <p className={`text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                {message}
              </p>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="w-full bg-rose-600 hover:bg-rose-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
