-- Add a goal and change its state (pause, resume, back to backlog, complete, archive, restore).
-- Each checks auth.uid() owns the goal; the goal triggers record goal.created and
-- goal.status_changed in lifeos_events.
create function public.lifeos_create_goal(
  p_title text, p_why text, p_success_definition text, p_target_date date, p_status text
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_profile uuid := public.lifeos_my_profile();
  v_title text := btrim(coalesce(p_title, ''));
  v_id uuid;
begin
  if char_length(v_title) not between 1 and 200 then
    raise exception 'a goal needs a title of 1 to 200 characters';
  end if;
  if coalesce(p_status, 'backlog') not in ('backlog', 'active') then
    raise exception 'a new goal starts in backlog or active';
  end if;
  if char_length(coalesce(p_why, '')) > 2000 or char_length(coalesce(p_success_definition, '')) > 2000 then
    raise exception 'why and success are at most 2000 characters';
  end if;
  insert into public.lifeos_goals (profile_id, title, why, success_definition, target_date, status)
  values (
    v_profile, v_title, btrim(coalesce(p_why, '')), btrim(coalesce(p_success_definition, '')),
    p_target_date, coalesce(p_status, 'backlog')
  ) returning id into v_id;
  return v_id;
end $$;

create function public.lifeos_set_goal_status(p_goal_id uuid, p_status text) returns text
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_profile uuid := public.lifeos_owned_goal(p_goal_id);
begin
  if p_status not in ('active', 'paused', 'backlog', 'completed', 'archived') then
    raise exception 'a goal can be active, paused, backlog, completed or archived';
  end if;
  update public.lifeos_goals g
  set status = p_status,
      archived_at = case when p_status = 'archived' then coalesce(g.archived_at, now()) end,
      completed_at = case when p_status = 'completed' then coalesce(g.completed_at, now()) end
  where g.id = p_goal_id and g.profile_id = v_profile;
  return p_status;
end $$;

revoke execute on function public.lifeos_create_goal(text, text, text, date, text)
  from public, anon, authenticated;
revoke execute on function public.lifeos_set_goal_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.lifeos_create_goal(text, text, text, date, text)
  to authenticated, service_role;
grant execute on function public.lifeos_set_goal_status(uuid, text) to authenticated, service_role;
