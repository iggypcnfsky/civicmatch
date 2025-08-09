-- Enable needed extensions
create extension if not exists pgcrypto;

-- Updated-at utility trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Profiles
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists profiles_data_gin on public.profiles using gin (data jsonb_path_ops);
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function set_updated_at();

alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- Connections
create table if not exists public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  data         jsonb not null default '{}',
  constraint connections_unique_pair unique (requester_id, addressee_id)
);
create index if not exists connections_status_idx on public.connections(status);
create index if not exists connections_requester_idx on public.connections(requester_id);
create index if not exists connections_addressee_idx on public.connections(addressee_id);
create trigger connections_set_updated_at
before update on public.connections
for each row execute function set_updated_at();

alter table public.connections enable row level security;
create policy "connections_participants_select" on public.connections
for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections_requester_insert" on public.connections
for insert with check (auth.uid() = requester_id);
create policy "connections_participants_update" on public.connections
for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "connections_requester_delete" on public.connections
for delete using (auth.uid() = requester_id);

-- Conversations
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists conversations_data_gin on public.conversations using gin (data jsonb_path_ops);
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function set_updated_at();

alter table public.conversations enable row level security;
create policy "conversations_participant_access" on public.conversations
for all using (
  exists (
    select 1 from jsonb_array_elements_text(data->'participantIds') pid
    where pid::uuid = auth.uid()
  )
)
with check (
  exists (
    select 1 from jsonb_array_elements_text(data->'participantIds') pid
    where pid::uuid = auth.uid()
  )
);

-- Messages
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  data             jsonb not null default '{}'
);
create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create trigger messages_set_updated_at
before update on public.messages
for each row execute function set_updated_at();

alter table public.messages enable row level security;
create policy "messages_select_if_participant" on public.messages
for select using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid
        where pid::uuid = auth.uid()
      )
  )
);
create policy "messages_insert_if_sender_participant" on public.messages
for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and exists (
        select 1 from jsonb_array_elements_text(c.data->'participantIds') pid
        where pid::uuid = auth.uid()
      )
  )
);
create policy "messages_update_own" on public.messages for update using (auth.uid() = sender_id);
create policy "messages_delete_own" on public.messages for delete using (auth.uid() = sender_id);

-- Saved searches
create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);
create index if not exists saved_searches_user_idx on public.saved_searches(user_id);
create index if not exists saved_searches_data_gin on public.saved_searches using gin (data jsonb_path_ops);
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function set_updated_at();

alter table public.saved_searches enable row level security;
create policy "saved_searches_owner_all" on public.saved_searches
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
