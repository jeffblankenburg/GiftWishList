'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ExternalLink, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface WishlistItem {
  id: string
  title: string
  url: string | null
  site_name: string | null
  image_url: string | null
  price: string | null
  notes: string | null
  group_id: string
  created_at: string
}

interface Group {
  id: string
  name: string
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [fetchedMeta, setFetchedMeta] = useState<{
    title: string | null
    siteName: string | null
    imageUrl: string | null
    price: string | null
  } | null>(null)
  const [fetching, setFetching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      loadItems()
    }
  }, [selectedGroupId])

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberships } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        groups (id, name)
      `)
      .eq('user_id', user.id)

    if (memberships && memberships.length > 0) {
      const groupList = memberships.map(m => m.groups as unknown as Group)
      setGroups(groupList)
      setSelectedGroupId(groupList[0].id)
    }
    setLoading(false)
  }

  async function loadItems() {
    if (!selectedGroupId) return

    const res = await fetch(`/api/wishlist?groupId=${selectedGroupId}`)
    const data = await res.json()

    if (res.ok) {
      setItems(data.items)
    }
  }

  async function fetchMetadata() {
    if (!url.trim()) return

    setFetching(true)
    setError('')

    try {
      const res = await fetch('/api/fetch-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setFetchedMeta({
          title: data.title,
          siteName: data.siteName,
          imageUrl: data.imageUrl,
          price: data.price,
        })
        if (data.title && !title) {
          setTitle(data.title)
        }
      }
    } catch {
      setError('Failed to fetch metadata')
    }

    setFetching(false)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedGroupId) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          title: title.trim(),
          url: url.trim() || null,
          siteName: fetchedMeta?.siteName || null,
          imageUrl: fetchedMeta?.imageUrl || null,
          price: fetchedMeta?.price || null,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add item')
        setSubmitting(false)
        return
      }

      setAddOpen(false)
      resetForm()
      loadItems()
    } catch {
      setError('Something went wrong')
    }

    setSubmitting(false)
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Delete this item from your wishlist?')) return

    await fetch(`/api/wishlist/${itemId}`, { method: 'DELETE' })
    loadItems()
  }

  function resetForm() {
    setUrl('')
    setTitle('')
    setNotes('')
    setFetchedMeta(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
          </div>
        </header>
        <main className="p-4">
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-600">Join a group first to start adding items!</p>
            <Button
              onClick={() => window.location.href = '/groups'}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Go to Groups
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
            {groups.length > 1 && (
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            {groups.length === 1 && (
              <p className="text-sm text-gray-500">{groups[0].name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/import">
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
            </Link>
            <Dialog open={addOpen} onOpenChange={(open) => {
              setAddOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add to Wishlist</DialogTitle>
                <DialogDescription>
                  Add an item by pasting a URL or entering details manually.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/product"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchMetadata}
                      disabled={!url.trim() || fetching}
                    >
                      {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                    </Button>
                  </div>
                </div>

                {fetchedMeta?.imageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={fetchedMeta.imageUrl}
                      alt=""
                      className="max-h-32 object-contain rounded"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Item name"
                    required
                  />
                </div>

                {fetchedMeta?.price && (
                  <div className="text-sm text-gray-600">
                    Price: <span className="font-medium">{fetchedMeta.price}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Size, color, or other preferences..."
                    rows={2}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="w-full bg-rose-600 hover:bg-rose-700"
                >
                  {submitting ? 'Adding...' : 'Add to Wishlist'}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-600">Your wishlist is empty</p>
            <p className="text-gray-500 text-sm">Tap &quot;Add&quot; to add items, or import from Amazon</p>
            <Link href="/import">
              <Button variant="outline" className="mt-2">
                <Upload className="w-4 h-4 mr-2" />
                Import from Amazon
              </Button>
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
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
                            className="font-medium text-gray-900 hover:text-rose-600 flex items-center gap-1"
                          >
                            <span className="truncate">{item.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                        )}
                        {item.site_name && (
                          <p className="text-xs text-gray-500">{item.site_name}</p>
                        )}
                        {item.price && (
                          <p className="text-sm font-medium text-rose-600 mt-1">{item.price}</p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  )
}
