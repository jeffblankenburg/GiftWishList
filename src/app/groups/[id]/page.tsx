'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Gift, ShoppingBag, Crown, Trash2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { BottomNav } from '@/components/BottomNav'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  user_id: string
  role: string
  display_name: string | null
  phone: string
  item_count: number
}

interface Group {
  id: string
  name: string
  code: string
  owner_id: string
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadGroupData()
  }, [id])

  async function loadGroupData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    // Get group details
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (groupError || !groupData) {
      router.push('/groups')
      return
    }

    setGroup(groupData)

    // Get members with their user info and item counts
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select(`
        id,
        user_id,
        role,
        users (
          id,
          display_name,
          phone
        )
      `)
      .eq('group_id', id)

    if (memberships) {
      // Get item counts for each member
      const membersWithCounts = await Promise.all(
        memberships.map(async (m) => {
          const userInfo = m.users as unknown as { id: string; display_name: string | null; phone: string }
          const { count } = await supabase
            .from('wishlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', m.user_id)
            .eq('group_id', id)

          return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            display_name: userInfo?.display_name,
            phone: userInfo?.phone || '',
            item_count: count || 0,
          }
        })
      )
      setMembers(membersWithCounts)
    }

    setLoading(false)
  }

  async function copyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function handleLeaveGroup() {
    if (!group) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/leave`, {
        method: 'POST',
      })
      if (res.ok) {
        router.push('/groups')
      }
    } catch (error) {
      console.error('Failed to leave group:', error)
    }
    setActionLoading(false)
  }

  async function handleDeleteGroup() {
    if (!group) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/groups')
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
    setActionLoading(false)
  }

  function formatPhone(phone: string) {
    const numbers = phone.replace(/\D/g, '').slice(-10)
    if (numbers.length !== 10) return phone
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  function getMemberDisplayName(member: Member) {
    if (member.display_name) return member.display_name
    if (member.phone) return formatPhone(member.phone)
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!group) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/groups" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {copiedCode ? (
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
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Members ({members.length})
          </h2>
        </div>

        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId
          const isOwner = member.role === 'owner'

          return (
            <Link
              key={member.id}
              href={isCurrentUser ? '/wishlist' : `/groups/${id}/member/${member.user_id}`}
            >
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                      {isCurrentUser ? (
                        <Gift className="w-5 h-5 text-rose-600" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {getMemberDisplayName(member)}
                          {isCurrentUser && ' (You)'}
                        </span>
                        {isOwner && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.item_count} {member.item_count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {isCurrentUser ? 'Edit list' : 'View list'}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {/* Leave/Delete Group Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {group.owner_id === currentUserId ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={actionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{group.name}&quot;? This will permanently remove the group, all members&apos; wishlists, and purchase history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteGroup}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  disabled={actionLoading}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave &quot;{group.name}&quot;? Your wishlist items in this group will be deleted. You can rejoin later with the invite code.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveGroup}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Leave
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
