-- ════════════════════════════════════════════════════════════════════════════
-- 0012 — Annulation d'une intervention (avec motif) et suppression d'un inventaire clôturé.
-- Uniquement des ajouts : compatible avec la version en ligne de l'application.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Annulation d'une intervention saisie par erreur ────────────────────────
-- L'intervention n'est jamais effacée : elle est marquée annulée, avec le motif, l'auteur et la date,
-- et reste visible (barrée) dans la fiche et dans le journal d'audit. Une annulation est définitive.
alter table public.interventions
  add column annulee_at       timestamptz,
  add column annulee_par      uuid references auth.users (id) on delete set null,
  add column annulation_motif text not null default '' check (char_length(annulation_motif) <= 300);

create function public.stamp_intervention_cancel() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.annulee_at is not null then
    raise exception 'intervention déjà annulée' using errcode = '42501';
  end if;
  if new.annulee_at is null then
    raise exception 'seule l''annulation d''une intervention est permise' using errcode = '42501';
  end if;
  if char_length(btrim(new.annulation_motif)) < 3 then
    raise exception 'motif d''annulation obligatoire' using errcode = '23514';
  end if;
  new.annulee_at := now();
  new.annulee_par := auth.uid();
  return new;
end $$;
create trigger interventions_cancel_stamp before update on public.interventions
  for each row execute function public.stamp_intervention_cancel();

create policy interventions_cancel on public.interventions for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_write_role() in ('admin', 'responsable'))
  with check (tenant_id = public.auth_tenant());
grant update (annulee_at, annulation_motif) on public.interventions to authenticated;

-- ── Suppression d'un inventaire clôturé (historique) ───────────────────────
-- Réservée aux administrateurs ; les constats de l'inventaire sont supprimés avec lui (on delete cascade).
-- Le journal d'audit garde la trace de la suppression.
create policy inventory_runs_delete on public.inventory_runs for delete to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_write_role() = 'admin' and status = 'cloture');
grant delete on public.inventory_runs to authenticated;
create trigger inventory_runs_audit_delete after delete on public.inventory_runs
  for each row execute function public.write_audit();
