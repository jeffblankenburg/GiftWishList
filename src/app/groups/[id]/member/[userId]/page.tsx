'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, ShoppingCart, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BottomNav } from '@/components/BottomNav'
import { createClient } from '@/lib/supabase/client'

interface WishlistItem {
  id: string
  title: string
  url: string | null
  site_name: string | null
  image_url: string | null
  price: string | null
  notes: string | null
  created_at: string
  purchase?: {
    buyer_id: string
    purchased_at: string
    buyer_notes: string | null
    buyer_name?: string
  } | null
}

interface MemberInfo {
  id: string
  display_name: string | null
  phone: string
}

export default function MemberWishlistPage({
  params
}: {
  params: Promise<{ id: string; userId: string }>
}) {
  const { id: groupId, userId: memberId } = use(params)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [buyerNotes, setBuyerNotes] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [groupId, memberId])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    // If trying to view own list, redirect to wishlist page
    if (user.id === memberId) {
      router.push('/wishlist')
      return
    }

    // Get member info
    const { data: memberData } = await supabase
      .from('users')
      .select('id, display_name, phone')
      .eq('id', memberId)
      .single()

    if (memberData) {
      setMember(memberData)
    }

    // Get all wishlist items for this member
    // Note: RLS will hide purchase data if viewing own items
    const { data: itemsData } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        purchases (
          buyer_id,
          purchased_at,
          buyer_notes
        )
      `)
      .eq('user_id', memberId)
      .order('created_at', { ascending: false })

    // Get any exclusions for this group
    const { data: exclusions } = await supabase
      .from('wishlist_item_exclusions')
      .select('item_id')
      .eq('group_id', groupId)

    const excludedItemIds = new Set(exclusions?.map(e => e.item_id) || [])

    // Filter out excluded items
    const filteredItems = itemsData?.filter(item => !excludedItemIds.has(item.id)) || []

    if (filteredItems.length > 0) {
      // Get buyer names for purchased items
      const itemsWithBuyerNames = await Promise.all(
        filteredItems.map(async (item) => {
          const purchase = item.purchases?.[0] || null
          if (purchase) {
            const { data: buyer } = await supabase
              .from('users')
              .select('display_name, phone')
              .eq('id', purchase.buyer_id)
              .single()

            return {
              ...item,
              purchase: {
                ...purchase,
                buyer_name: buyer?.display_name || formatPhone(buyer?.phone || ''),
              },
            }
          }
          return { ...item, purchase: null }
        })
      )
      setItems(itemsWithBuyerNames)
    }

    setLoading(false)
  }

  function formatPhone(phone: string) {
    const numbers = phone.replace(/\D/g, '').slice(-10)
    if (numbers.length !== 10) return phone
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }

  function getMemberDisplayName() {
    if (member?.display_name) return member.display_name
    if (member?.phone) return formatPhone(member.phone)
    return 'Member'
  }

  function openPurchaseDialog(itemId: string) {
    setSelectedItemId(itemId)
    setBuyerNotes('')
    setPurchaseDialogOpen(true)
  }

  async function handlePurchase() {
    if (!selectedItemId) return

    setPurchasing(true)

    try {
      const res = await fetch(`/api/wishlist/${selectedItemId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerNotes: buyerNotes.trim() || null }),
      })

      if (res.ok) {
        setPurchaseDialogOpen(false)
        loadData()
      }
    } catch {
      // Handle error silently
    }

    setPurchasing(false)
  }

  async function handleUnmarkPurchase(itemId: string) {
    if (!confirm('Unmark this item as purchased?')) return

    await fetch(`/api/wishlist/${itemId}/purchase`, { method: 'DELETE' })
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/groups/${groupId}`} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{getMemberDisplayName()}&apos;s Wishlist</h1>
              <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No items in wishlist yet</p>
          </div>
        ) : (
          items.map((item) => {
            const isPurchased = !!item.purchase
            const isPurchasedByMe = item.purchase?.buyer_id === currentUserId

            return (
              <Card key={item.id} className={isPurchased ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-medium flex items-center gap-1 ${
                                isPurchased ? 'text-gray-500 line-through' : 'text-gray-900 hover:text-rose-600'
                              }`}
                            >
                              <span className="truncate">{item.title}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <h3 className={`font-medium truncate ${
                              isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>
                              {item.title}
                            </h3>
                          )}
                          {item.site_name && (
                            <p className="text-xs text-gray-500">{item.site_name}</p>
                          )}
                          {item.price && (
                            <p className={`text-sm font-medium mt-1 ${
                              isPurchased ? 'text-gray-400' : 'text-rose-600'
                            }`}>
                              {item.price}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                          {isPurchased && (
                            <div className="mt-2 text-sm">
                              <span className="text-green-600 font-medium flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Purchased by {item.purchase?.buyer_name}
                              </span>
                              {item.purchase?.buyer_notes && (
                                <p className="text-gray-500 mt-1 italic">
                                  &quot;{item.purchase.buyer_notes}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isPurchased ? (
                            isPurchasedByMe && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnmarkPurchase(item.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPurchaseDialog(item.id)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Buy
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </main>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Purchased</DialogTitle>
            <DialogDescription>
              Let others know you&apos;ve bought this item. Only you and other group members (not {getMemberDisplayName()}) can see this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes for other buyers (optional)
              </label>
              <Textarea
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="e.g., Got the blue one from Amazon..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPurchaseDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {purchasing ? 'Marking...' : 'Mark as Purchased'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
