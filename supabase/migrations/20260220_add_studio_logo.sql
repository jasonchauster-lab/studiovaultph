-- Add logo_url column to studios table
alter table studios add column if not exists logo_url text;
