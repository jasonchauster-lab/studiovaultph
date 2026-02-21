-- Add is_read column to support_messages if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'support_messages' and column_name = 'is_read') then
        alter table support_messages add column is_read boolean default false;
    end if;
end $$;
