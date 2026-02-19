CREATE OR REPLACE FUNCTION public.get_team_members(t_id uuid)
 RETURNS TABLE(user_id uuid, username text, email text, avatar_url text, card_image_url text, role text, joined_at timestamp with time zone, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- security check: only allow if caller is owner or member
  if exists (select 1 from public.teams t where t.id = t_id and t.owner_id = auth.uid())
     or exists (select 1 from public.team_members tm where tm.team_id = t_id and tm.user_id = auth.uid() and tm.is_active = true)
  then
    return query
      select 
        p.id as user_id, 
        p.username, 
        p.email, 
        p.avatar_url,
        p.card_image_url, -- Added this field
        tm.role::text, 
        tm.joined_at, 
        tm.is_active
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = t_id
        and tm.is_active = true;
  else
    -- Return empty set if not authorized
    return;
  end if;
end;
$function$;
