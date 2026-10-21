-- Plateforme SaaS : statut/abonnement des entreprises, logo, super-admin (opérateur du service).

alter table public.tenants
  add column status text not null default 'active' check (status in ('active', 'blocked')),
  add column plan text not null default 'essai' check (plan in ('essai', 'standard', 'premium')),
  add column plan_expires_at date,
  add column logo_data text check (
    logo_data is null or (char_length(logo_data) <= 250000
      and logo_data ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')),
  add column alerts_enabled boolean not null default true;

-- Une entreprise bloquée ou dont l'abonnement est expiré n'a plus accès à ses données.
create or replace function public.auth_tenant() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active
    and t.status = 'active' and (t.plan_expires_at is null or t.plan_expires_at >= current_date)
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active
    and t.status = 'active' and (t.plan_expires_at is null or t.plan_expires_at >= current_date)
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- Les administrateurs d'entreprise règlent nom, couleur, logo et alertes ; jamais statut ni abonnement.
revoke update on public.tenants from authenticated;
grant update (name, accent, logo_data, alerts_enabled) on public.tenants to authenticated;

-- État de l'entreprise de l'utilisateur, même bloquée (pour afficher un message clair).
create function public.my_tenant_state() returns table (name text, status text, plan text, plan_expires_at date)
language sql stable security definer set search_path = ''
as $$
  select t.name, t.status, t.plan, t.plan_expires_at
  from public.profiles p join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid()
$$;
revoke all on function public.my_tenant_state() from public, anon;
grant execute on function public.my_tenant_state() to authenticated;

-- Essai gratuit de 30 jours à l'inscription.
create or replace function public.create_tenant(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Ce compte est déjà rattaché à une entreprise';
  end if;
  insert into public.tenants (name, plan, plan_expires_at)
  values (trim(p_name), 'essai', current_date + 30) returning id into v_tenant;
  insert into public.profiles (user_id, tenant_id, display_name, role)
  values (auth.uid(), v_tenant, trim(p_display_name), 'admin');
  return v_tenant;
end $$;

-- ── Super-admin ───────────────────────────────────────────────────────────
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;
revoke all on public.platform_admins from anon, authenticated;   -- aucune politique : inaccessible par l'API

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Vue d'ensemble : uniquement des agrégats, jamais le contenu métier des clients.
create function public.platform_tenants() returns table (
  id uuid, name text, status text, plan text, plan_expires_at date, created_at timestamptz,
  users bigint, instruments bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  return query
    select t.id, t.name, t.status, t.plan, t.plan_expires_at, t.created_at,
           (select count(*) from public.profiles p where p.tenant_id = t.id),
           (select count(*) from public.instruments i where i.tenant_id = t.id and i.deleted_at is null)
    from public.tenants t order by t.created_at desc;
end $$;

create function public.platform_set_tenant(p_tenant uuid, p_status text, p_plan text, p_expires date)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_before jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  if p_status not in ('active', 'blocked') or p_plan not in ('essai', 'standard', 'premium') then
    raise exception 'Valeur invalide';
  end if;
  select jsonb_build_object('status', status, 'plan', plan, 'plan_expires_at', plan_expires_at)
    into v_before from public.tenants where id = p_tenant;
  if v_before is null then raise exception 'Entreprise introuvable'; end if;
  update public.tenants set status = p_status, plan = p_plan, plan_expires_at = p_expires where id = p_tenant;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (p_tenant, auth.uid(), 'platform_update', 'tenants', p_tenant::text,
          jsonb_build_object('before', v_before,
            'after', jsonb_build_object('status', p_status, 'plan', p_plan, 'plan_expires_at', p_expires)));
end $$;
revoke all on function public.platform_tenants(), public.platform_set_tenant(uuid, text, text, date) from public, anon;
grant execute on function public.platform_tenants(), public.platform_set_tenant(uuid, text, text, date) to authenticated;

-- Journal des alertes envoyées (évite les doublons) : réservé au service (clé service_role).
create table public.alert_log (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sent_on   date not null,
  items     int not null,
  primary key (tenant_id, sent_on)
);
alter table public.alert_log enable row level security;
alter table public.alert_log force row level security;
revoke all on public.alert_log from anon, authenticated;
