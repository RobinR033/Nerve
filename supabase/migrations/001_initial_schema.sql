-- Nerve — initieel database schema
-- Fase 1: tasks tabel met volledige metadata + RLS

-- Enums
create type priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('todo', 'in_progress', 'done', 'late');

-- Tasks tabel
create table tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Kern
  title             text not null,
  description       text,
  status            task_status not null default 'todo',
  priority          priority not null default 'medium',

  -- Planning
  deadline          timestamptz,
  deadline_has_time boolean not null default false,

  -- Organisatie
  project           text,
  context           text,        -- bijv. '@thuis', '@computer', '@bellen'
  tags              text[] not null default '{}',

  -- Archivering (nooit hard deleten)
  archived_at       timestamptz,

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexen
create index tasks_user_id_idx on tasks(user_id);
create index tasks_status_idx on tasks(status);
create index tasks_deadline_idx on tasks(deadline) where deadline is not null;
create index tasks_archived_at_idx on tasks(archived_at);

-- Updated_at automatisch bijwerken
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Row Level Security
alter table tasks enable row level security;

-- Policies: gebruikers zien en bewerken alleen hun eigen taken
create policy "Gebruikers lezen eigen taken"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Gebruikers maken eigen taken aan"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Gebruikers bewerken eigen taken"
  on tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Gebruikers verwijderen eigen taken"
  on tasks for delete
  using (auth.uid() = user_id);
