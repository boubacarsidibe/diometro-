-- 0015 · Console plateforme : journal des actions et relances des entreprises.
-- Les modifications d'abonnement sont déjà tracées dans audit_log (action 'platform_update', migration 0007).
-- Les relances envoyées sont tracées dans une table propre à la plateforme, invisible des clients.

create table public.platform_events (
  id         bigint generated always as identity primary key,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid,
  action     text not null check (action in ('relance')),
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.platform_events (tenant_id, created_at desc);
alter table public.platform_events enable row level security;
-- Aucune règle d'accès : lecture et écriture uniquement par les fonctions ci-dessous.
revoke all on public.platform_events from public, anon, authenticated;

create function public.platform_log_relance(p_tenant uuid, p_to text, p_subject text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  if not exists (select 1 from public.tenants where id = p_tenant) then raise exception 'Entreprise introuvable'; end if;
  insert into public.platform_events (tenant_id, user_id, action, detail)
  values (p_tenant, auth.uid(), 'relance', jsonb_build_object('to', left(p_to, 320), 'subject', left(p_subject, 200)));
end $$;
revoke all on function public.platform_log_relance(uuid, text, text) from public, anon;
grant execute on function public.platform_log_relance(uuid, text, text) to authenticated;

-- Journal : inscriptions, modifications d'abonnement et relances, du plus récent au plus ancien.
create function public.platform_journal(p_tenant uuid default null, p_limit int default 300)
returns table (at timestamptz, tenant_id uuid, tenant_name text, actor text, kind text, detail jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  return query
    select j.at, j.tenant_id, j.tenant_name, j.actor, j.kind, j.detail from (
      select t.created_at as at, t.id as tenant_id, t.name as tenant_name, null::text as actor, 'inscription'::text as kind, '{}'::jsonb as detail
        from public.tenants t
      union all
      select a.created_at, a.tenant_id, t.name, (select p.display_name from public.profiles p where p.user_id = a.user_id), 'modification'::text, a.detail
        from public.audit_log a join public.tenants t on t.id = a.tenant_id
        where a.action = 'platform_update'
      union all
      select e.created_at, e.tenant_id, t.name, (select p.display_name from public.profiles p where p.user_id = e.user_id), e.action, e.detail
        from public.platform_events e join public.tenants t on t.id = e.tenant_id
    ) j
    where p_tenant is null or j.tenant_id = p_tenant
    order by j.at desc
    limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;
revoke all on function public.platform_journal(uuid, int) from public, anon;
grant execute on function public.platform_journal(uuid, int) to authenticated;
