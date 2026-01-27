-- Migration: Change wishlist items from group-centric to user-centric
-- Items now belong to a user and are visible to ALL their groups by default
-- Exclusions table tracks which items are hidden from specific groups

-- Step 1: Make group_id nullable on wishlist_items
ALTER TABLE wishlist_items ALTER COLUMN group_id DROP NOT NULL;

-- Step 2: Create exclusions table
CREATE TABLE wishlist_item_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES wishlist_items(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(item_id, group_id)
);

-- Step 3: Enable RLS on exclusions table
ALTER TABLE wishlist_item_exclusions ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS policies for exclusions
-- Users can manage exclusions on their own items
CREATE POLICY "Users can read own item exclusions"
  ON wishlist_item_exclusions FOR SELECT
  TO authenticated
  USING (
    item_id IN (SELECT id FROM wishlist_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create exclusions on own items"
  ON wishlist_item_exclusions FOR INSERT
  TO authenticated
  WITH CHECK (
    item_id IN (SELECT id FROM wishlist_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete exclusions on own items"
  ON wishlist_item_exclusions FOR DELETE
  TO authenticated
  USING (
    item_id IN (SELECT id FROM wishlist_items WHERE user_id = auth.uid())
  );

-- Step 5: Update wishlist_items RLS policies
-- Users can now see items from fellow group members (excluding hidden items)
DROP POLICY IF EXISTS "Users can read items in their groups" ON wishlist_items;

CREATE POLICY "Users can read own items"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read group members items"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (
    -- Item owner is in at least one group with the viewer
    EXISTS (
      SELECT 1 FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = wishlist_items.user_id
      AND gm1.user_id != gm2.user_id
    )
    -- And the item is not excluded from ALL shared groups
    AND EXISTS (
      SELECT 1 FROM group_memberships gm1
      JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = wishlist_items.user_id
      AND gm1.group_id NOT IN (
        SELECT group_id FROM wishlist_item_exclusions
        WHERE item_id = wishlist_items.id
      )
    )
  );

-- Step 6: Create index for performance
CREATE INDEX idx_wishlist_item_exclusions_item_id ON wishlist_item_exclusions(item_id);
CREATE INDEX idx_wishlist_item_exclusions_group_id ON wishlist_item_exclusions(group_id);
