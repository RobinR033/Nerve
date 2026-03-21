-- Sneeuwschuiver-mechanisme: verlate taken naar status 'late' zetten
-- Draait bij app-start én via een geplande Supabase Edge Function (later)

create or replace function mark_late_tasks()
returns void as $$
begin
  update tasks
  set status = 'late'
  where
    status in ('todo', 'in_progress')
    and deadline is not null
    and deadline < now()
    and archived_at is null;
end;
$$ language plpgsql security definer;

-- Geef de authenticated rol toegang om deze functie aan te roepen
grant execute on function mark_late_tasks() to authenticated;
