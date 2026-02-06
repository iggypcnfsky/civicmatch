-- Projects table
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists projects_slug_idx on public.projects(slug);
create index if not exists projects_data_gin on public.projects using gin (data jsonb_path_ops);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function set_updated_at();

alter table public.projects enable row level security;
create policy "projects_select_all" on public.projects for select using (true);
create policy "projects_insert_authenticated" on public.projects for insert with check (auth.uid() is not null);
create policy "projects_update_member" on public.projects for update using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);
create policy "projects_delete_founder" on public.projects for delete using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'founder'
  )
);

-- Project members join table
create table if not exists public.project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member',
  created_at timestamptz not null default now(),
  data       jsonb not null default '{}',
  constraint unique_project_member unique (project_id, user_id)
);

create index if not exists project_members_project_idx on public.project_members(project_id);
create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists project_members_role_idx on public.project_members(role);

alter table public.project_members enable row level security;
create policy "project_members_select_all" on public.project_members for select using (true);
create policy "project_members_insert_admin" on public.project_members for insert with check (
  auth.uid() is not null and (
    -- Allow founders/admins to add members
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('founder', 'admin')
    )
    -- Or allow self-join (for initial project creation)
    or auth.uid() = user_id
  )
);
create policy "project_members_update_admin" on public.project_members for update using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);
create policy "project_members_delete_admin_or_self" on public.project_members for delete using (
  auth.uid() = user_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Game completions tracking
create table if not exists public.game_completions (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  data         jsonb not null default '{}',
  constraint unique_game_completion unique (project_id, user_id)
);

create index if not exists game_completions_project_idx on public.game_completions(project_id);
create index if not exists game_completions_user_idx on public.game_completions(user_id);

alter table public.game_completions enable row level security;
create policy "game_completions_select_own" on public.game_completions for select using (auth.uid() = user_id);
create policy "game_completions_insert_own" on public.game_completions for insert with check (auth.uid() = user_id);
