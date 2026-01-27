'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { BottomNav } from '@/components/BottomNav'

interface ImportItem {
  title: string
  price: string | null
  image: string | null
  url: string | null
  selected: boolean
}

export default function ImportPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ImportItem[]>([])
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setItems([])
    setSuccess(false)

    try {
      const res = await fetch('/api/import/amazon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch wishlist')
        setLoading(false)
        return
      }

      setItems(data.items.map((item: Omit<ImportItem, 'selected'>) => ({
        ...item,
        selected: true,
      })))
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  async function handleImport() {
    const selectedItems = items.filter(item => item.selected)
    if (selectedItems.length === 0) {
      setError('Please select at least one item')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/import/amazon/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save items')
        setSaving(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/wishlist')
      }, 1500)
    } catch {
      setError('Something went wrong')
    }
    setSaving(false)
  }

  function toggleItem(index: number) {
    setItems(items.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ))
  }

  function toggleAll(selected: boolean) {
    setItems(items.map(item => ({ ...item, selected })))
  }

  const selectedCount = items.filter(item => item.selected).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/wishlist" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Import from Amazon</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {success ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">Items imported successfully!</p>
              <p className="text-gray-500 text-sm">Redirecting to your wishlist...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <form onSubmit={handleFetch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Amazon Wishlist URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.com/hz/wishlist/ls/..."
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                Paste the link to your public Amazon wishlist
              </p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full bg-rose-600 hover:bg-rose-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching items...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Fetch Wishlist
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedCount} of {items.length} items selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(false)}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="space-y-2">
              {items.map((item, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    item.selected ? 'ring-2 ring-rose-500 bg-rose-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleItem(index)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      item.selected ? 'bg-rose-600 border-rose-600' : 'border-gray-300'
                    }`}>
                      {item.selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-12 h-12 object-contain rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm line-clamp-2">
                        {item.title}
                      </p>
                      {item.price && (
                        <p className="text-sm text-green-600 font-medium">{item.price}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={saving || selectedCount === 0}
              className="w-full bg-rose-600 hover:bg-rose-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setItems([])
                setUrl('')
              }}
              className="w-full"
            >
              Start Over
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
