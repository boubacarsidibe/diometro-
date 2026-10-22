-- Reprise des champs métier de l'ancienne version, limite d'instruments par formule,
-- tarifs en FCFA, organisme d'accréditation configurable, lien public QR (désactivé par défaut).

-- ── Instruments ───────────────────────────────────────────────────────────
alter table public.instruments
  add column conformite        text not null default 'À vérifier' check (conformite in ('Oui', 'Non', 'À vérifier')),
  add column mode_utilisation  text not null default '' check (char_length(mode_utilisation) <= 200),
  add column graduation        text not null default '' check (char_length(graduation) <= 100),
  add column tolerance         text not null default '' check (char_length(tolerance) <= 100),
  add column proprietaire      text not null default '' check (char_length(proprietaire) <= 120),
  add column stockage          text not null default '' check (char_length(stockage) <= 200),
  add column etalonnage_type   text not null default 'À définir' check (etalonnage_type in ('Interne', 'Externe', 'Interne et externe', 'À définir')),
  add column origine_frequence text not null default '' check (char_length(origine_frequence) <= 200),
  add column raccordement      text not null default '' check (char_length(raccordement) <= 200),
  add column fiche_link        text not null default '' check (char_length(fiche_link) <= 500 and (fiche_link = '' or fiche_link ~* '^https?://')),
  add column certificat_link   text not null default '' check (char_length(certificat_link) <= 500 and (certificat_link = '' or certificat_link ~* '^https?://')),
  add column procedure_link    text not null default '' check (char_length(procedure_link) <= 500 and (procedure_link = '' or procedure_link ~* '^https?://')),
  add column prestataire_id    uuid references public.prestataires (id) on delete set null,
  add column catalog_id        text not null default '' check (char_length(catalog_id) <= 60),
  add column public_token      uuid unique;

grant insert (conformite, mode_utilisation, graduation, tolerance, proprietaire, stockage, etalonnage_type,
              origine_frequence, raccordement, fiche_link, certificat_link, procedure_link, prestataire_id, catalog_id)
  on public.instruments to authenticated;
grant update (conformite, mode_utilisation, graduation, tolerance, proprietaire, stockage, etalonnage_type,
              origine_frequence, raccordement, fiche_link, certificat_link, procedure_link, prestataire_id, catalog_id)
  on public.instruments to authenticated;

-- ── Interventions : mode et résultat des calculateurs ─────────────────────
alter table public.interventions
  add column mode        text not null default 'Externe' check (mode in ('Interne', 'Externe')),
  add column calcul_type text check (calcul_type in ('pipette', 'pt100', 'direct')),
  add column calcul      jsonb check (calcul is null or pg_column_size(calcul) < 30000);
grant insert (mode, calcul_type, calcul) on public.interventions to authenticated;

-- ── Prestataires : tarifs ─────────────────────────────────────────────────
alter table public.prestataires
  add column tarif_horaire numeric(12, 2) check (tarif_horaire is null or (tarif_horaire >= 0 and tarif_horaire < 100000000)),
  add column devise        text not null default 'XOF' check (devise in ('XOF', 'EUR', 'USD')),
  add column grille_tarifs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(grille_tarifs) = 'array' and jsonb_array_length(grille_tarifs) <= 50 and pg_column_size(grille_tarifs) < 20000);
grant insert (tarif_horaire, devise, grille_tarifs) on public.prestataires to authenticated;
grant update (tarif_horaire, devise, grille_tarifs) on public.prestataires to authenticated;

-- ── Utilisateurs : téléphone de récupération ──────────────────────────────
alter table public.profiles add column phone text not null default '' check (char_length(phone) <= 40);
grant update (phone) on public.profiles to authenticated;

-- ── Entreprises : profil, limite par formule, organisme d'accréditation, devise ─
alter table public.tenants
  add column sector              text not null default '' check (char_length(sector) <= 100),
  add column buildings           text[] not null default '{}' check (cardinality(buildings) <= 50),
  add column phone               text not null default '' check (char_length(phone) <= 40),
  add column max_instruments     int check (max_instruments is null or max_instruments >= 0),
  add column accreditation_label text not null default 'COFRAC' check (char_length(accreditation_label) between 1 and 60),
  add column currency            text not null default 'XOF' check (currency in ('XOF', 'EUR', 'USD'));
update public.tenants set max_instruments = 50 where max_instruments is null;
alter table public.tenants alter column max_instruments set default 50;

alter table public.tenants drop constraint tenants_plan_check;
alter table public.tenants add constraint tenants_plan_check
  check (plan in ('essai', 'starter', 'standard', 'pro', 'entreprise', 'grandcompte', 'custom'));
update public.tenants set plan = 'starter' where plan = 'premium';

grant update (sector, buildings, phone, accreditation_label, currency) on public.tenants to authenticated;

-- Limite d'instruments : refus d'un nouvel instrument actif au-delà du quota de la formule.
create function public.enforce_instrument_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_max int; v_count bigint;
begin
  select max_instruments into v_max from public.tenants where id = new.tenant_id;
  if v_max is not null then
    select count(*) into v_count from public.instruments where tenant_id = new.tenant_id and deleted_at is null;
    if v_count >= v_max then
      raise exception 'Limite d''instruments atteinte pour votre formule (%)', v_max;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_instrument_limit() from public, anon, authenticated;
create trigger instruments_limit before insert on public.instruments
  for each row execute function public.enforce_instrument_limit();

-- Le prestataire par défaut d'un instrument doit appartenir à la même entreprise.
create function public.check_instrument_prestataire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.prestataire_id is not null and not exists (
       select 1 from public.prestataires p where p.id = new.prestataire_id and p.tenant_id = new.tenant_id) then
    raise exception 'Prestataire inconnu pour cette entreprise';
  end if;
  return new;
end $$;
revoke all on function public.check_instrument_prestataire() from public, anon, authenticated;
create trigger instruments_prestataire_check before insert or update on public.instruments
  for each row execute function public.check_instrument_prestataire();

-- ── Inscription enrichie ──────────────────────────────────────────────────
create function public.register_tenant(
  p_name text, p_display_name text, p_sector text default '', p_phone text default '', p_buildings text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Ce compte est déjà rattaché à une entreprise';
  end if;
  insert into public.tenants (name, plan, plan_expires_at, max_instruments, sector, phone, buildings)
  values (trim(p_name), 'essai', current_date + 30, 50, left(coalesce(p_sector, ''), 100),
          left(coalesce(p_phone, ''), 40), coalesce(p_buildings, '{}'))
  returning id into v_tenant;
  insert into public.profiles (user_id, tenant_id, display_name, role, phone)
  values (auth.uid(), v_tenant, trim(p_display_name), 'admin', left(coalesce(p_phone, ''), 40));
  return v_tenant;
end $$;
revoke all on function public.register_tenant(text, text, text, text, text[]) from public, anon;
grant execute on function public.register_tenant(text, text, text, text, text[]) to authenticated;
-- Ancienne version (sans les champs de profil) : on retire le droit de l'appeler, sans la supprimer.
revoke execute on function public.create_tenant(text, text) from authenticated;

-- ── Super-admin : formule + limite d'instruments ──────────────────────────
create function public.platform_update_tenant(p_tenant uuid, p_status text, p_plan text, p_expires date, p_max int default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_before jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  if p_status not in ('active', 'blocked')
     or p_plan not in ('essai', 'starter', 'standard', 'pro', 'entreprise', 'grandcompte', 'custom')
     or (p_max is not null and p_max < 0) then
    raise exception 'Valeur invalide';
  end if;
  select jsonb_build_object('status', status, 'plan', plan, 'plan_expires_at', plan_expires_at, 'max_instruments', max_instruments)
    into v_before from public.tenants where id = p_tenant;
  if v_before is null then raise exception 'Entreprise introuvable'; end if;
  update public.tenants set status = p_status, plan = p_plan, plan_expires_at = p_expires, max_instruments = p_max where id = p_tenant;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (p_tenant, auth.uid(), 'platform_update', 'tenants', p_tenant::text,
          jsonb_build_object('before', v_before, 'after',
            jsonb_build_object('status', p_status, 'plan', p_plan, 'plan_expires_at', p_expires, 'max_instruments', p_max)));
end $$;
revoke all on function public.platform_update_tenant(uuid, text, text, date, int) from public, anon;
grant execute on function public.platform_update_tenant(uuid, text, text, date, int) to authenticated;
revoke execute on function public.platform_set_tenant(uuid, text, text, date) from authenticated;

create function public.platform_overview() returns table (
  id uuid, name text, status text, plan text, plan_expires_at date, created_at timestamptz,
  users bigint, instruments bigint, max_instruments int, sector text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'Accès refusé'; end if;
  return query
    select t.id, t.name, t.status, t.plan, t.plan_expires_at, t.created_at,
           (select count(*) from public.profiles p where p.tenant_id = t.id),
           (select count(*) from public.instruments i where i.tenant_id = t.id and i.deleted_at is null),
           t.max_instruments, t.sector
    from public.tenants t order by t.created_at desc;
end $$;
revoke all on function public.platform_overview() from public, anon;
grant execute on function public.platform_overview() to authenticated;
revoke execute on function public.platform_tenants() from authenticated;

-- ── Lien public QR (lecture seule, désactivé par défaut) ──────────────────
create function public.set_public_link(p_instrument uuid, p_enabled boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant(); v_token uuid;
begin
  if v_tenant is null or public.auth_role() not in ('admin', 'responsable') then
    raise exception 'Droits insuffisants';
  end if;
  update public.instruments
     set public_token = case when p_enabled then coalesce(public_token, gen_random_uuid()) else null end
   where id = p_instrument and tenant_id = v_tenant and deleted_at is null
   returning public_token into v_token;
  if not found then raise exception 'Instrument introuvable'; end if;
  return v_token;
end $$;
revoke all on function public.set_public_link(uuid, boolean) from public, anon;
grant execute on function public.set_public_link(uuid, boolean) to authenticated;

-- Données minimales exposées publiquement : jamais de commentaires, documents, lieux ni prestataires.
create function public.public_instrument(p_token uuid) returns table (
  ref text, designation text, type_mesure text, statut text, conformite text,
  date_etalonnage date, date_prochaine date, entreprise text)
language sql stable security definer set search_path = ''
as $$
  select i.ref, i.designation, i.type_mesure, i.statut, i.conformite, i.date_etalonnage, i.date_prochaine, t.name
  from public.instruments i join public.tenants t on t.id = i.tenant_id
  where i.public_token = p_token and i.deleted_at is null
    and t.status = 'active' and (t.plan_expires_at is null or t.plan_expires_at >= current_date)
$$;
revoke all on function public.public_instrument(uuid) from public;
grant execute on function public.public_instrument(uuid) to anon, authenticated;
