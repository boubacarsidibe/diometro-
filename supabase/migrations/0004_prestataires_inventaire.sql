-- Prestataires (carnet) et inventaire physique des instruments.
-- Rappel Supabase : les nouvelles tables/fonctions reçoivent des droits par défaut pour anon/authenticated ;
-- on les retire explicitement puis on accorde le strict nécessaire.

create table public.prestataires (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  nom              text not null check (char_length(nom) between 1 and 200),
  type             text not null default 'Étalonnage externe'
                   check (type in ('Étalonnage externe', 'Maintenance', 'Fabricant', 'Autre')),
  domaines         text[] not null default '{}' check (cardinality(domaines) <= 20),
  cofrac           boolean not null default false,
  ref_cofrac       text not null default '' check (char_length(ref_cofrac) <= 100),
  adresse          text not null default '' check (char_length(adresse) <= 300),
  telephone        text not null default '' check (char_length(telephone) <= 40),
  email            text not null default '' check (char_length(email) <= 254),
  site_web         text not null default '' check (char_length(site_web) <= 300 and (site_web = '' or site_web ~* '^https?://')),
  contact_nom      text not null default '' check (char_length(contact_nom) <= 120),
  contact_fonction text not null default '' check (char_length(contact_fonction) <= 120),
  delai_moyen_jours int check (delai_moyen_jours is null or delai_moyen_jours between 0 and 365),
  note_interne     int not null default 0 check (note_interne between 0 and 5),
  actif            boolean not null default true,
  commentaires     text not null default '' check (char_length(commentaires) <= 2000),
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, nom)
);
create index on public.prestataires (tenant_id);

alter table public.interventions add column prestataire_id uuid references public.prestataires (id) on delete set null;

create trigger prestataires_touch before update on public.prestataires
  for each row execute function public.touch_updated_at();
create trigger prestataires_guard before update on public.prestataires
  for each row execute function public.guard_tenant_fk();
create trigger prestataires_audit after insert or update or delete on public.prestataires
  for each row execute function public.write_audit();

-- Une intervention ne peut viser qu'un instrument ET un prestataire de la même entreprise.
create or replace function public.check_intervention_tenant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.instruments i
                 where i.id = new.instrument_id and i.tenant_id = new.tenant_id) then
    raise exception 'Instrument inconnu pour cette entreprise';
  end if;
  if new.prestataire_id is not null and not exists (
       select 1 from public.prestataires p where p.id = new.prestataire_id and p.tenant_id = new.tenant_id) then
    raise exception 'Prestataire inconnu pour cette entreprise';
  end if;
  return new;
end $$;

alter table public.prestataires enable row level security;
alter table public.prestataires force row level security;
revoke all on public.prestataires from anon, authenticated;

create policy prestataires_select on public.prestataires for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy prestataires_insert on public.prestataires for insert to authenticated
  with check (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable'));
create policy prestataires_update on public.prestataires for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable'))
  with check (tenant_id = public.auth_tenant());

grant select on public.prestataires to authenticated;
grant insert (tenant_id, nom, type, domaines, cofrac, ref_cofrac, adresse, telephone, email, site_web,
              contact_nom, contact_fonction, delai_moyen_jours, note_interne, actif, commentaires)
  on public.prestataires to authenticated;
grant update (nom, type, domaines, cofrac, ref_cofrac, adresse, telephone, email, site_web,
              contact_nom, contact_fonction, delai_moyen_jours, note_interne, actif, commentaires, deleted_at)
  on public.prestataires to authenticated;
grant insert (prestataire_id) on public.interventions to authenticated;

-- ── Inventaire ────────────────────────────────────────────────────────────
create table public.inventory_runs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  status      text not null default 'en_cours' check (status in ('en_cours', 'cloture')),
  note        text not null default '' check (char_length(note) <= 500),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  total_count int,
  found_count int
);
create unique index inventory_one_open on public.inventory_runs (tenant_id) where status = 'en_cours';
create index on public.inventory_runs (tenant_id, created_at desc);

create table public.inventory_checks (
  run_id        uuid not null references public.inventory_runs (id) on delete cascade,
  instrument_id uuid not null references public.instruments (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  found         boolean not null default false,
  checked_by    uuid references auth.users (id) on delete set null,
  checked_at    timestamptz,
  primary key (run_id, instrument_id)
);

create function public.stamp_inventory_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.checked_by := auth.uid();
  new.checked_at := now();
  return new;
end $$;
create trigger inventory_checks_stamp before update on public.inventory_checks
  for each row execute function public.stamp_inventory_check();
create trigger inventory_runs_audit after insert or update on public.inventory_runs
  for each row execute function public.write_audit();

alter table public.inventory_runs enable row level security;
alter table public.inventory_runs force row level security;
alter table public.inventory_checks enable row level security;
alter table public.inventory_checks force row level security;
revoke all on public.inventory_runs, public.inventory_checks from anon, authenticated;

create policy inventory_runs_select on public.inventory_runs for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy inventory_checks_select on public.inventory_checks for select to authenticated
  using (tenant_id = public.auth_tenant());
-- Cocher/décocher uniquement pendant un inventaire ouvert.
create policy inventory_checks_update on public.inventory_checks for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable')
         and exists (select 1 from public.inventory_runs r where r.id = run_id and r.status = 'en_cours'))
  with check (tenant_id = public.auth_tenant());
grant select on public.inventory_runs, public.inventory_checks to authenticated;
grant update (found) on public.inventory_checks to authenticated;

-- Démarrage et clôture passent par des fonctions : les compteurs ne peuvent pas être falsifiés.
create function public.start_inventory(p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant(); v_run uuid;
begin
  if v_tenant is null or public.auth_role() not in ('admin', 'responsable') then
    raise exception 'Droits insuffisants';
  end if;
  insert into public.inventory_runs (tenant_id, note, created_by)
  values (v_tenant, left(coalesce(p_note, ''), 500), auth.uid())
  returning id into v_run;
  insert into public.inventory_checks (run_id, instrument_id, tenant_id)
  select v_run, i.id, v_tenant from public.instruments i
  where i.tenant_id = v_tenant and i.deleted_at is null and i.statut <> 'Réformé';
  return v_run;
end $$;

create function public.close_inventory(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant();
begin
  if v_tenant is null or public.auth_role() not in ('admin', 'responsable') then
    raise exception 'Droits insuffisants';
  end if;
  update public.inventory_runs r set
    status = 'cloture', closed_at = now(),
    total_count = (select count(*) from public.inventory_checks c where c.run_id = r.id),
    found_count = (select count(*) from public.inventory_checks c where c.run_id = r.id and c.found)
  where r.id = p_run and r.tenant_id = v_tenant and r.status = 'en_cours';
  if not found then raise exception 'Inventaire introuvable ou déjà clôturé'; end if;
end $$;

revoke all on function public.start_inventory(text), public.close_inventory(uuid) from public, anon;
grant execute on function public.start_inventory(text), public.close_inventory(uuid) to authenticated;
revoke all on function public.stamp_inventory_check() from public, anon, authenticated;
