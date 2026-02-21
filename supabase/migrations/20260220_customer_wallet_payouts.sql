-- Add wallet_balance to profiles
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "wallet_balance" numeric(10,2) NOT NULL DEFAULT 0.00;

-- Update payout_requests to support customer payouts
-- It previously had an 'instructor_id' column added manually or dynamically. 
-- We will add a 'user_id' column that links to auth.users, and we can migrate existing 'instructor_id' data if needed, or just keep them synced.

ALTER TABLE "public"."payout_requests"
ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- If 'instructor_id' exists, let's copy that data over to 'user_id' so we have a unified column
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payout_requests' AND column_name = 'instructor_id') THEN
    UPDATE "public"."payout_requests" SET "user_id" = "instructor_id" WHERE "user_id" IS NULL;
  END IF;
END $$;

-- Drop old instructor policies if they exist so we can replace them with unified user policies
DROP POLICY IF EXISTS "Instructors can view their own payout requests" ON "public"."payout_requests";
DROP POLICY IF EXISTS "Instructors can insert payout requests" ON "public"."payout_requests";

-- New Unified Policies for Payout Requests
-- Users (Instructors or Customers) can view their own requests
CREATE POLICY "Users can view their own payout requests" 
ON "public"."payout_requests"
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert payout requests" 
ON "public"."payout_requests"
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure admins can view all updates (if an admin policy doesn't already broadly cover it)
-- We'll add one just to be safe
DROP POLICY IF EXISTS "Admins can view all payout requests" ON "public"."payout_requests";
CREATE POLICY "Admins can view all payout requests" 
ON "public"."payout_requests"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
