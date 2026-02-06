-- Ideas table for project ideas (simpler than research - just description)
create table if not exists public.ideas (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data       jsonb not null default '{}'
);

create index if not exists ideas_project_idx on public.ideas(project_id);
create index if not exists ideas_creator_idx on public.ideas(creator_id);
create index if not exists ideas_created_idx on public.ideas(created_at desc);

alter table public.ideas enable row level security;

-- Members (game completers) can view ideas
create policy "ideas_select_members" on public.ideas for select using (
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = ideas.project_id
      and gc.user_id = auth.uid()
  )
);

-- Members can add ideas
create policy "ideas_insert_members" on public.ideas for insert with check (
  auth.uid() = creator_id and
  exists (
    select 1 from public.game_completions gc
    where gc.project_id = ideas.project_id
      and gc.user_id = auth.uid()
  )
);

-- Only creator can update their own ideas
create policy "ideas_update_own" on public.ideas for update using (
  auth.uid() = creator_id
);

-- Creator or admins can delete
create policy "ideas_delete_own_or_admin" on public.ideas for delete using (
  auth.uid() = creator_id or
  exists (
    select 1 from public.project_members pm
    where pm.project_id = ideas.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('founder', 'admin')
  )
);

-- Votes table (polymorphic - can vote on ideas or research)
create table if not exists public.votes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  target_type  text not null check (target_type in ('idea', 'research')),
  target_id    uuid not null,
  vote_value   smallint not null check (vote_value in (-1, 1)),
  created_at   timestamptz not null default now(),
  constraint unique_user_vote unique (user_id, target_type, target_id)
);

create index if not exists votes_target_idx on public.votes(target_type, target_id);
create index if not exists votes_user_idx on public.votes(user_id);

alter table public.votes enable row level security;

-- Anyone authenticated can see votes
create policy "votes_select_authenticated" on public.votes for select using (auth.uid() is not null);

-- Users can vote (insert)
create policy "votes_insert_own" on public.votes for insert with check (auth.uid() = user_id);

-- Users can change their vote (update)
create policy "votes_update_own" on public.votes for update using (auth.uid() = user_id);

-- Users can remove their vote (delete)
create policy "votes_delete_own" on public.votes for delete using (auth.uid() = user_id);

-- Function to get vote counts for a target
create or replace function get_vote_counts(p_target_type text, p_target_id uuid)
returns table(upvotes bigint, downvotes bigint, total bigint) as $$
begin
  return query
  select 
    coalesce(sum(case when vote_value = 1 then 1 else 0 end), 0) as upvotes,
    coalesce(sum(case when vote_value = -1 then 1 else 0 end), 0) as downvotes,
    coalesce(sum(vote_value), 0) as total
  from public.votes
  where target_type = p_target_type and target_id = p_target_id;
end;
$$ language plpgsql security definer;

-- Function to increment XP for a user
create or replace function increment_user_xp(p_user_id uuid, p_amount integer)
returns void as $$
begin
  update public.profiles
  set data = jsonb_set(
    data,
    '{xp}',
    to_jsonb(coalesce((data->>'xp')::integer, 0) + p_amount)
  )
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- Trigger to award XP when idea is created
create or replace function award_xp_on_idea_insert()
returns trigger as $$
begin
  perform increment_user_xp(NEW.creator_id, 10);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger ideas_award_xp
after insert on public.ideas
for each row execute function award_xp_on_idea_insert();

-- Trigger to award XP when research is created
create or replace function award_xp_on_research_insert()
returns trigger as $$
begin
  perform increment_user_xp(NEW.creator_id, 15);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger research_nodes_award_xp
after insert on public.research_nodes
for each row execute function award_xp_on_research_insert();
