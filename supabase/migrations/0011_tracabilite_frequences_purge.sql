-- ════════════════════════════════════════════════════════════════════════════
-- 0011 — Traçabilité des interventions (ISO 17025), fréquences « à chaque utilisation »
-- et « à vie », commentaire terrain d'inventaire, suppression définitive sur demande.
-- Uniquement des ajouts : compatible avec la version en ligne de l'application.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Traçabilité : opérateur, étalon de référence, conditions ambiantes ─────
alter table public.interventions
  add column operateur            text not null default '' check (char_length(operateur) <= 120),
  add column etalon_reference     text not null default '' check (char_length(etalon_reference) <= 200),
  add column temperature_ambiante numeric(5, 2) check (temperature_ambiante between -50 and 100),
  add column humidite_relative    numeric(5, 2) check (humidite_relative between 0 and 100);
grant insert (operateur, etalon_reference, temperature_ambiante, humidite_relative) on public.interventions to authenticated;

-- ── Fréquences : ajout de « à chaque utilisation » et « à vie » ────────────
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.instruments'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%frequence_unite%' and pg_get_constraintdef(oid) not like '%frequence_valeur%'
  loop
    execute format('alter table public.instruments drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.instruments add constraint instruments_frequence_unite_check
  check (frequence_unite in ('jour', 'semaine', 'mois', 'annee', 'utilisation', 'vie'));

-- ── Inventaire : constat noté sur le terrain pour chaque instrument ────────
alter table public.inventory_checks add column commentaire text not null default '' check (char_length(commentaire) <= 300);
grant update (commentaire) on public.inventory_checks to authenticated;

-- ── Suppression définitive (droit à l'effacement) ──────────────────────────
-- Uniquement par un administrateur, uniquement pour un élément déjà archivé (corbeille) de son entreprise.
-- Supprime aussi interventions, pièces jointes (lignes) et constats d'inventaire de l'instrument.
-- Le journal d'audit garde la trace de la suppression (qui, quand, quoi).
create function public.purge_archived(p_table text, p_id uuid) returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare tenant uuid := public.auth_tenant();
begin
  if tenant is null or public.auth_write_role() is distinct from 'admin' then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_table = 'instruments' then
    delete from public.instruments where id = p_id and tenant_id = tenant and deleted_at is not null;
  elsif p_table = 'prestataires' then
    delete from public.prestataires where id = p_id and tenant_id = tenant and deleted_at is not null;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  if not found then raise exception 'élément introuvable ou non archivé' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.purge_archived(text, uuid) from public, anon;
grant execute on function public.purge_archived(text, uuid) to authenticated;
