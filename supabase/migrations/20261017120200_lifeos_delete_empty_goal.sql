-- Delete a goal only while it is empty. History is never deleted: a goal with any plan,
-- measure, evidence, reflection, media or conversation can only be archived.
create function public.lifeos_delete_empty_goal(p_goal_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_profile uuid := public.lifeos_owned_goal(p_goal_id);
  v_title text;
begin
  select g.title into v_title from public.lifeos_goals g where g.id = p_goal_id for update;
  if exists (select 1 from public.lifeos_goal_tasks where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_goal_milestones where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_goal_metrics where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_goal_evidence where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_goal_reflections where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_goal_media where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_room_sessions where goal_id = p_goal_id)
     or exists (select 1 from public.lifeos_room_memories where goal_id = p_goal_id) then
    raise exception 'this goal has history; archive it instead';
  end if;
  insert into public.lifeos_events (profile_id, event_type, source, payload)
  values (v_profile, 'goal.deleted', 'experience_the_ai',
          jsonb_build_object('goal_id', p_goal_id, 'title', v_title));
  delete from public.lifeos_room_agents where goal_id = p_goal_id;
  delete from public.lifeos_goal_rooms where goal_id = p_goal_id;
  delete from public.lifeos_goals where id = p_goal_id;
end $$;
revoke execute on function public.lifeos_delete_empty_goal(uuid) from public, anon, authenticated;
grant execute on function public.lifeos_delete_empty_goal(uuid) to authenticated, service_role;
