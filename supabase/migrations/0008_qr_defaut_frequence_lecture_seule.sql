-- 0008 : QR public actif par défaut, fréquence valeur + unité, lecture seule après l'essai.
-- Aucune instruction DROP : les anciennes fonctions sont désactivées (droits retirés), pas supprimées.

-- ── QR public : jeton long et aléatoire dès la création ───────────────────
-- gen_random_uuid() s'appuie sur le générateur cryptographique de PostgreSQL (122 bits aléatoires).
alter table public.instruments alter column public_token set default gen_random_uuid();
update public.instruments set public_token = gen_random_uuid() where public_token is null and deleted_at is null;

-- Données publiques strictement limitées : référence, désignation, statut, conformité, dates, lieu.
create function public.public_fiche(p_token uuid) returns table (
  ref text, designation text, statut text, conformite text,
  date_etalonnage date, date_prochaine date, lieu text)
language sql stable security definer set search_path = ''
as $$
  select i.ref, i.designation, i.statut, i.conformite, i.date_etalonnage, i.date_prochaine,
         nullif(concat_ws(' · ', nullif(i.batiment, ''), nullif(i.zone, '')), '')
  from public.instruments i join public.tenants t on t.id = i.tenant_id
  where i.public_token = p_token and i.deleted_at is null and t.status = 'active'
$$;
revoke all on function public.public_fiche(uuid) from public;
grant execute on function public.public_fiche(uuid) to anon, authenticated;
revoke execute on function public.public_instrument(uuid) from public, anon, authenticated;

-- ── Fréquence d'étalonnage : valeur + unité ───────────────────────────────
alter table public.instruments
  add column frequence_valeur int check (frequence_valeur is null or frequence_valeur between 1 and 3650),
  add column frequence_unite  text check (frequence_unite in ('jour', 'semaine', 'mois', 'annee'));
alter table public.instruments add constraint instruments_frequence_coherente
  check ((frequence_valeur is null) = (frequence_unite is null));
update public.instruments set frequence_valeur = frequence_mois, frequence_unite = 'mois' where frequence_mois is not null;
grant insert (frequence_valeur, frequence_unite) on public.instruments to authenticated;
grant update (frequence_valeur, frequence_unite) on public.instruments to authenticated;

-- ── Lecture seule après l'essai (les données ne sont jamais supprimées) ───
-- Lecture : entreprise active, même si l'abonnement est expiré. Écriture : abonnement valide en plus.
create or replace function public.auth_tenant() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function public.auth_write_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and (t.plan_expires_at is null or t.plan_expires_at >= current_date)
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;
revoke all on function public.auth_write_role() from public, anon;
grant execute on function public.auth_write_role() to authenticated;

alter policy tenants_update on public.tenants
  using (id = public.auth_tenant() and public.auth_write_role() = 'admin')
  with check (id = public.auth_tenant());
alter policy profiles_update_admin on public.profiles
  using (tenant_id = public.auth_tenant() and public.auth_write_role() = 'admin')
  with check (tenant_id = public.auth_tenant() and public.auth_write_role() = 'admin');
alter policy profiles_update_coordinator on public.profiles
  using (tenant_id = public.auth_tenant() and public.auth_write_role() = 'responsable' and role <> 'admin')
  with check (tenant_id = public.auth_tenant() and role <> 'admin');
alter policy instruments_insert on public.instruments
  with check (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'));
alter policy instruments_update on public.instruments
  using (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'))
  with check (tenant_id = public.auth_tenant());
alter policy interventions_insert on public.interventions
  with check (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable') and realise_par = auth.uid());
alter policy prestataires_insert on public.prestataires
  with check (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'));
alter policy prestataires_update on public.prestataires
  using (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'))
  with check (tenant_id = public.auth_tenant());
alter policy inventory_checks_update on public.inventory_checks
  using (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable')
         and exists (select 1 from public.inventory_runs r where r.id = run_id and r.status = 'en_cours'))
  with check (tenant_id = public.auth_tenant());
alter policy attachments_insert on public.attachments
  with check (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable') and uploaded_by = auth.uid());
alter policy attachments_delete on public.attachments
  using (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'));
alter policy attachments_objects_insert on storage.objects
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_tenant()::text
              and public.auth_write_role() in ('admin', 'responsable'));
alter policy attachments_objects_delete on storage.objects
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_tenant()::text
         and public.auth_write_role() in ('admin', 'responsable'));

-- Fonctions d'écriture : même règle (coalesce : un rôle NULL ne doit jamais passer le contrôle).
create or replace function public.start_inventory(p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant(); v_run uuid;
begin
  if v_tenant is null or coalesce(public.auth_write_role()::text, '') not in ('admin', 'responsable') then
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

create or replace function public.close_inventory(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant();
begin
  if v_tenant is null or coalesce(public.auth_write_role()::text, '') not in ('admin', 'responsable') then
    raise exception 'Droits insuffisants';
  end if;
  update public.inventory_runs r set
    status = 'cloture', closed_at = now(),
    total_count = (select count(*) from public.inventory_checks c where c.run_id = r.id),
    found_count = (select count(*) from public.inventory_checks c where c.run_id = r.id and c.found)
  where r.id = p_run and r.tenant_id = v_tenant and r.status = 'en_cours';
  if not found then raise exception 'Inventaire introuvable ou déjà clôturé'; end if;
end $$;

create or replace function public.set_public_link(p_instrument uuid, p_enabled boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := public.auth_tenant(); v_token uuid;
begin
  if v_tenant is null or coalesce(public.auth_write_role()::text, '') not in ('admin', 'responsable') then
    raise exception 'Droits insuffisants';
  end if;
  update public.instruments
     set public_token = case when p_enabled then coalesce(public_token, gen_random_uuid()) else null end
   where id = p_instrument and tenant_id = v_tenant and deleted_at is null
   returning public_token into v_token;
  if not found then raise exception 'Instrument introuvable'; end if;
  return v_token;
end $$;
