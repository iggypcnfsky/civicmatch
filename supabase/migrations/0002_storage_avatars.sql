-- Storage setup for avatars bucket and RLS policies

-- Ensure RLS is enabled (should already be enabled by default)
alter table if exists storage.objects enable row level security;

-- Create a public bucket for profile avatars (no-op if it already exists)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read access for avatars
create policy "avatars_public_read" on storage.objects
for select using (
  bucket_id = 'avatars'
);

-- Authenticated users can upload only into their own folder (prefix matches auth.uid())
create policy "avatars_authenticated_upload_own_folder" on storage.objects
for insert to authenticated with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Authenticated users can update their own objects
create policy "avatars_update_own" on storage.objects
for update to authenticated using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Authenticated users can delete their own objects
create policy "avatars_delete_own" on storage.objects
for delete to authenticated using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);


