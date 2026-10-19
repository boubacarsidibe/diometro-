-- DIOMETRO : schéma multi-entreprise avec isolation par Row Level Security.
-- Toute règle d'accès est appliquée ICI (base de données), jamais côté navigateur.

create type public.user_role as enum ('admin', 'responsable', 'consultation');

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  accent      text not null default '#1d4ed8' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 120),
  role          public.user_role not null default 'consultation',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on public.profiles (tenant_id);

create table public.instruments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  ref             text not null check (char_length(ref) between 1 and 60),
  designation     text not null check (char_length(designation) between 1 and 200),
  type_mesure     text not null default '' check (char_length(type_mesure) <= 100),
  batiment        text not null default '' check (char_length(batiment) <= 100),
  zone            text not null default '' check (char_length(zone) <= 100),
  statut          text not null default 'En service'
                  check (statut in ('En service', 'Hors service', 'En réparation', 'Réformé')),
  date_etalonnage date,
  date_prochaine  date,
  frequence_mois  int check (frequence_mois is null or frequence_mois between 1 and 120),
  commentaires    text not null default '' check (char_length(commentaires) <= 2000),
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, ref)
);
create index on public.instruments (tenant_id, date_prochaine);

create table public.interventions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  instrument_id  uuid not null references public.instruments (id) on delete cascade,
  date           date not null,
  type           text not null default 'Étalonnage'
                 check (type in ('Étalonnage', 'Vérification', 'Réparation', 'Ajustage')),
  resultat       text not null default 'Conforme'
                 check (resultat in ('Conforme', 'Non conforme', 'Conforme avec réserve')),
  prestataire    text not null default '' check (char_length(prestataire) <= 200),
  ref_certificat text not null default '' check (char_length(ref_certificat) <= 100),
  observation    text not null default '' check (char_length(observation) <= 2000),
  realise_par    uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index on public.interventions (instrument_id, date desc);

-- Journal d'audit : écriture uniquement par triggers, jamais modifiable ni supprimable.
create table public.audit_log (
  id         bigint generated always as identity primary key,
  tenant_id  uuid not null,
  user_id    uuid,
  action     text not null,
  entity     text not null,
  entity_id  text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (tenant_id, created_at desc);

-- ── Fonctions d'aide (SECURITY DEFINER, search_path figé) ─────────────────
-- Retournent NULL si le compte est inactif ou si la MFA (aal2) n'a pas été validée.
create function public.auth_tenant() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  where p.user_id = auth.uid() and p.active
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function public.auth_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.user_id = auth.uid() and p.active
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

revoke all on function public.auth_tenant(), public.auth_role() from public, anon;
grant execute on function public.auth_tenant(), public.auth_role() to authenticated;

-- ── Triggers ──────────────────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger instruments_touch before update on public.instruments
  for each row execute function public.touch_updated_at();

-- Interdit de changer l'entreprise d'une ligne, et de retirer le dernier admin actif.
create function public.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.tenant_id <> old.tenant_id or new.user_id <> old.user_id then
      raise exception 'tenant_id et user_id sont immuables';
    end if;
    if old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active) then
      if not exists (
        select 1 from public.profiles
        where tenant_id = old.tenant_id and role = 'admin' and active and user_id <> old.user_id
      ) then
        raise exception 'Impossible de retirer le dernier administrateur actif';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

create function public.guard_tenant_fk() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.tenant_id <> old.tenant_id then
    raise exception 'tenant_id est immuable';
  end if;
  return new;
end $$;
create trigger instruments_guard before update on public.instruments
  for each row execute function public.guard_tenant_fk();
create trigger interventions_guard before update on public.interventions
  for each row execute function public.guard_tenant_fk();

-- Cohérence : une intervention doit viser un instrument de la même entreprise.
create function public.check_intervention_tenant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.instruments i
                 where i.id = new.instrument_id and i.tenant_id = new.tenant_id) then
    raise exception 'Instrument inconnu pour cette entreprise';
  end if;
  return new;
end $$;
create trigger interventions_tenant_check before insert or update on public.interventions
  for each row execute function public.check_intervention_tenant();

create function public.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (
    r.tenant_id, auth.uid(), lower(tg_op), tg_table_name,
    coalesce(to_jsonb(r) ->> 'id', to_jsonb(r) ->> 'user_id'),
    case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
         else to_jsonb(r) end
  );
  return r;
end $$;
create trigger instruments_audit after insert or update or delete on public.instruments
  for each row execute function public.write_audit();
create trigger interventions_audit after insert or update or delete on public.interventions
  for each row execute function public.write_audit();
create trigger profiles_audit after update or delete on public.profiles
  for each row execute function public.write_audit();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.tenants       enable row level security;
alter table public.profiles      enable row level security;
alter table public.instruments   enable row level security;
alter table public.interventions enable row level security;
alter table public.audit_log     enable row level security;
alter table public.tenants       force row level security;
alter table public.profiles      force row level security;
alter table public.instruments   force row level security;
alter table public.interventions force row level security;
alter table public.audit_log     force row level security;

create policy tenants_select on public.tenants for select to authenticated
  using (id = public.auth_tenant());
create policy tenants_update on public.tenants for update to authenticated
  using (id = public.auth_tenant() and public.auth_role() = 'admin')
  with check (id = public.auth_tenant());

-- Un utilisateur peut toujours lire SON profil (nécessaire avant la MFA) ; les autres profils exigent aal2.
create policy profiles_select_self on public.profiles for select to authenticated
  using (user_id = auth.uid());
create policy profiles_select_tenant on public.profiles for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() = 'admin')
  with check (tenant_id = public.auth_tenant());

create policy instruments_select on public.instruments for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy instruments_insert on public.instruments for insert to authenticated
  with check (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable'));
create policy instruments_update on public.instruments for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable'))
  with check (tenant_id = public.auth_tenant());

create policy interventions_select on public.interventions for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy interventions_insert on public.interventions for insert to authenticated
  with check (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable')
              and realise_par = auth.uid());

create policy audit_select on public.audit_log for select to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() = 'admin');

-- Aucun DELETE direct : suppression logique des instruments (deleted_at). Pas de policy => refusé.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.tenants, public.profiles, public.instruments, public.interventions, public.audit_log to authenticated;
grant update (name, accent) on public.tenants to authenticated;
grant update (display_name, role, active) on public.profiles to authenticated;
grant insert (tenant_id, ref, designation, type_mesure, batiment, zone, statut,
              date_etalonnage, date_prochaine, frequence_mois, commentaires) on public.instruments to authenticated;
grant update (ref, designation, type_mesure, batiment, zone, statut,
              date_etalonnage, date_prochaine, frequence_mois, commentaires, deleted_at) on public.instruments to authenticated;
grant insert (tenant_id, instrument_id, date, type, resultat, prestataire, ref_certificat, observation, realise_par)
  on public.interventions to authenticated;

-- ── Inscription : crée l'entreprise et le premier administrateur ──────────
create function public.create_tenant(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Ce compte est déjà rattaché à une entreprise';
  end if;
  insert into public.tenants (name) values (trim(p_name)) returning id into v_tenant;
  insert into public.profiles (user_id, tenant_id, display_name, role)
  values (auth.uid(), v_tenant, trim(p_display_name), 'admin');
  return v_tenant;
end $$;
revoke all on function public.create_tenant(text, text) from public, anon;
grant execute on function public.create_tenant(text, text) to authenticated;
