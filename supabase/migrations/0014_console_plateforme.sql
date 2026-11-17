-- 0014 · Console plateforme : e-mail de l'administrateur et dernière connexion de chaque entreprise.
-- Toujours des totaux uniquement : aucune donnée métier des clients n'est exposée.
-- Le type de retour change : la fonction est supprimée puis recréée (create or replace ne le permet pas).

drop function if exists public.platform_overview();

create function public.platform_overview() returns table (
  id uuid, name text, status text, plan text, plan_expires_at date, created_at timestamptz,
  users bigint, instruments bigint, max_instruments int, sector text,
  admin_email text, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  return query
    select t.id, t.name, t.status, t.plan, t.plan_expires_at, t.created_at,
           (select count(*) from public.profiles p where p.tenant_id = t.id),
           (select count(*) from public.instruments i where i.tenant_id = t.id and i.deleted_at is null),
           t.max_instruments, t.sector,
           (select u.email::text from public.profiles p join auth.users u on u.id = p.user_id
             where p.tenant_id = t.id and p.role = 'admin' and p.active
             order by p.created_at limit 1),
           (select max(u.last_sign_in_at) from public.profiles p join auth.users u on u.id = p.user_id
             where p.tenant_id = t.id)
    from public.tenants t order by t.created_at desc;
end $$;

revoke all on function public.platform_overview() from public, anon;
grant execute on function public.platform_overview() to authenticated;
