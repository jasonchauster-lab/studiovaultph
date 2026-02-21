-- Add gallery_images column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';
