'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Plus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { BottomNav } from '@/components/BottomNav'
import { createClient } from '@/lib/supabase/client'

interface Group {
  id: string
  name: string
  code: string
  owner_id: string
  member_count: number
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get groups the user belongs to
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        role,
        groups (
          id,
          name,
          code,
          owner_id
        )
      `)
      .eq('user_id', user.id)

    if (memberships) {
      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        memberships.map(async (m) => {
          const group = m.groups as unknown as { id: string; name: string; code: string; owner_id: string }
          const { count } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)

          return {
            ...group,
            member_count: count || 0,
          }
        })
      )
      setGroups(groupsWithCounts)
    }
    setLoading(false)
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create group')
        setSubmitting(false)
        return
      }

      setCreateOpen(false)
      setNewGroupName('')
      loadGroups()
    } catch {
      setError('Something went wrong')
    }
    setSubmitting(false)
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join group')
        setSubmitting(false)
        return
      }

      setJoinOpen(false)
      setJoinCode('')
      loadGroups()
    } catch {
      setError('Something went wrong')
    }
    setSubmitting(false)
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">My Groups</h1>
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Join
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Group</DialogTitle>
                  <DialogDescription>
                    Enter the invite code shared with you to join a group.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">Invite Code</Label>
                    <Input
                      id="joinCode"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABCD1234"
                      maxLength={8}
                      className="uppercase"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" disabled={submitting || !joinCode.trim()} className="w-full bg-rose-600 hover:bg-rose-700">
                    {submitting ? 'Joining...' : 'Join Group'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Group</DialogTitle>
                  <DialogDescription>
                    Create a new group to share wishlists with family and friends.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Smith Family"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" disabled={submitting || !newGroupName.trim()} className="w-full bg-rose-600 hover:bg-rose-700">
                    {submitting ? 'Creating...' : 'Create Group'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-600 font-medium">No groups yet</p>
              <p className="text-gray-500 text-sm">Create a group or join one with an invite code</p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      copyCode(group.code)
                    }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                  >
                    {copiedCode === group.code ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="font-mono">{group.code}</span>
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  )
}
