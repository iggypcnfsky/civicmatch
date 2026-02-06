-- Jobs table for project job listings
create table if not exists public.jobs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists jobs_project_idx on public.jobs(project_id);
create index if not exists jobs_creator_idx on public.jobs(creator_id);
create index if not exists jobs_status_idx on public.jobs((data->>'status'));
create index if not exists jobs_type_idx on public.jobs((data->>'type'));

-- Update trigger for updated_at
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function set_updated_at();

alter table public.jobs enable row level security;

-- Members (game completers) can view jobs
create policy "jobs_select_members" on public.jobs for select using (
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = jobs.project_id
      and gc.user_id = auth.uid()
  )
);

-- Only founders/admins can add jobs
create policy "jobs_insert_admin" on public.jobs for insert with check (
  auth.uid() = creator_id and
  exists (
    select 1 from public.project_members pm
    where pm.project_id = jobs.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Only creator or admins can update jobs
create policy "jobs_update_own_or_admin" on public.jobs for update using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = jobs.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Creator or admins can delete
create policy "jobs_delete_own_or_admin" on public.jobs for delete using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = jobs.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);
