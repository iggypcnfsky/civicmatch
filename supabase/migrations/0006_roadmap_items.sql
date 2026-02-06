-- Roadmap items table for project Kanban board
create table if not exists public.roadmap_items (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists roadmap_items_project_idx on public.roadmap_items(project_id);
create index if not exists roadmap_items_creator_idx on public.roadmap_items(creator_id);
create index if not exists roadmap_items_status_idx on public.roadmap_items((data->>'status'));

-- Update trigger for updated_at
create trigger roadmap_items_set_updated_at
before update on public.roadmap_items
for each row execute function set_updated_at();

alter table public.roadmap_items enable row level security;

-- Members (game completers) can view roadmap items
create policy "roadmap_items_select_members" on public.roadmap_items for select using (
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = roadmap_items.project_id
      and gc.user_id = auth.uid()
  )
);

-- Members can add roadmap items
create policy "roadmap_items_insert_members" on public.roadmap_items for insert with check (
  auth.uid() = creator_id and
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = roadmap_items.project_id
      and gc.user_id = auth.uid()
  )
);

-- Only creator or admins can update roadmap items
create policy "roadmap_items_update_own_or_admin" on public.roadmap_items for update using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = roadmap_items.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Creator or admins can delete
create policy "roadmap_items_delete_own_or_admin" on public.roadmap_items for delete using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = roadmap_items.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Add 'roadmap' to allowed target types in votes table
alter table public.votes drop constraint if exists votes_target_type_check;
alter table public.votes add constraint votes_target_type_check 
  check (target_type in ('idea', 'research', 'roadmap'));
