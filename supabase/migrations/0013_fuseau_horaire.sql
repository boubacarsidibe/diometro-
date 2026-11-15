-- 0013 · Fuseau horaire de chaque entreprise.
-- Les horodatages (journal d'audit, pièces jointes, inventaires, exports) et le « jour » des alertes
-- suivent le fuseau choisi par l'entreprise. Valeur par défaut : Dakar, soit le comportement d'avant.
alter table public.tenants add column if not exists time_zone text not null default 'Africa/Dakar';
alter table public.tenants drop constraint if exists tenants_time_zone_check;
-- Nom de fuseau IANA (ex. Africa/Dakar, Europe/Paris, America/Toronto). L'application vérifie aussi qu'il existe.
alter table public.tenants add constraint tenants_time_zone_check
  check (time_zone ~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+\-]+){1,2})$' and length(time_zone) <= 64);
-- L'administrateur de l'entreprise peut le modifier (Paramètres), comme les autres réglages.
grant update (time_zone) on public.tenants to authenticated;
