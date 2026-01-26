import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Gift } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/groups')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center">
              <Gift className="w-12 h-12 text-rose-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">GiftWishList</h1>
            <p className="text-gray-600 text-lg">
              Share wishlists with family and friends.
              Coordinate gifts without spoiling the surprise.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/login">
              <Button className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-lg">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="pt-8 space-y-2 text-sm text-gray-500">
            <p className="font-medium text-gray-700">How it works:</p>
            <ul className="space-y-1">
              <li>Create or join a gift group</li>
              <li>Add items to your wishlist</li>
              <li>Others can mark items as purchased</li>
              <li>You never see what&apos;s been bought for you</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
