-- Research nodes table for project research items
create table if not exists public.research_nodes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists research_nodes_project_idx on public.research_nodes(project_id);
create index if not exists research_nodes_creator_idx on public.research_nodes(creator_id);
create index if not exists research_nodes_created_idx on public.research_nodes(created_at desc);

alter table public.research_nodes enable row level security;

-- Anyone can view research nodes for projects they have access to (completed game)
create policy "research_nodes_select_members" on public.research_nodes for select using (
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = research_nodes.project_id
      and gc.user_id = auth.uid()
  )
);

-- Members (game completers) can add research nodes
create policy "research_nodes_insert_members" on public.research_nodes for insert with check (
  auth.uid() = creator_id and
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = research_nodes.project_id
      and gc.user_id = auth.uid()
  )
);

-- Only creator can update their own research nodes
create policy "research_nodes_update_own" on public.research_nodes for update using (
  auth.uid() = creator_id
);

-- Creator can delete their own, or project admins can delete any
create policy "research_nodes_delete_own_or_admin" on public.research_nodes for delete using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = research_nodes.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);
