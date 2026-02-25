-- Add amenities column to studios table
ALTER TABLE public.studios 
ADD COLUMN amenities text[] DEFAULT '{}';
