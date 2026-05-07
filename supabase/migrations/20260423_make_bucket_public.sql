-- Migration: Make payment-proofs bucket public
-- This simplifies the dashboard visibility and solves all signed URL / RLS issues.

UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';

-- Ensure everyone can read from the public bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-proofs');
