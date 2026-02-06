-- Events table
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists events_creator_idx on public.events(creator_id);
create index if not exists events_data_gin on public.events using gin (data jsonb_path_ops);
create index if not exists events_created_at_idx on public.events(created_at desc);

create trigger events_set_updated_at
before update on public.events
for each row execute function set_updated_at();

alter table public.events enable row level security;

-- Anyone can view events
create policy "events_select_all" on public.events for select using (true);

-- Authenticated users can create events
create policy "events_insert_authenticated" on public.events 
for insert with check (auth.uid() is not null and auth.uid() = creator_id);

-- Only creator can update their events
create policy "events_update_own" on public.events 
for update using (auth.uid() = creator_id);

-- Only creator can delete their events
create policy "events_delete_own" on public.events 
for delete using (auth.uid() = creator_id);

-- Event RSVPs table
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data       jsonb not null default '{}',
  constraint unique_event_rsvp unique (event_id, user_id)
);

create index if not exists event_rsvps_event_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_user_idx on public.event_rsvps(user_id);
create index if not exists event_rsvps_created_at_idx on public.event_rsvps(created_at desc);

alter table public.event_rsvps enable row level security;

-- Anyone can view RSVPs
create policy "event_rsvps_select_all" on public.event_rsvps for select using (true);

-- Authenticated users can RSVP to events
create policy "event_rsvps_insert_own" on public.event_rsvps 
for insert with check (auth.uid() is not null and auth.uid() = user_id);

-- Users can only delete their own RSVPs
create policy "event_rsvps_delete_own" on public.event_rsvps 
for delete using (auth.uid() = user_id);
