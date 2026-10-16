-- The signed-in person's own LifeOS profile, for the reviewed goal writes.
create function public.lifeos_my_profile() returns uuid
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_profile uuid;
begin
  select p.id into v_profile from public.lifeos_profiles p where p.user_id = (select auth.uid());
  if v_profile is null then
    raise exception 'no LifeOS profile for the signed-in person';
  end if;
  return v_profile;
end $$;
revoke execute on function public.lifeos_my_profile() from public, anon, authenticated;
grant execute on function public.lifeos_my_profile() to service_role;
