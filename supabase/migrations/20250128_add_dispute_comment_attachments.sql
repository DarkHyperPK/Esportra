-- Add attachment_url column to dispute_comments table for image uploads
begin;

-- Add attachment_url column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dispute_comments'
      and column_name = 'attachment_url'
  ) then
    alter table public.dispute_comments 
    add column attachment_url text;
  end if;
end $$;

-- Add index for attachment_url queries (only if column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dispute_comments'
      and column_name = 'attachment_url'
  ) then
    create index if not exists idx_dc_attachment_url on public.dispute_comments(attachment_url) 
    where attachment_url is not null;
  end if;
end $$;

commit;

