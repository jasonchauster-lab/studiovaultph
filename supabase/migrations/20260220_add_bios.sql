-- Add bio column to profiles and studios tables
alter table profiles add column if not exists bio text;
alter table studios add column if not exists bio text;
