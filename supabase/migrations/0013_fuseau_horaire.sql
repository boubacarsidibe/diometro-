-- 0013 · Pays et fuseau horaire de chaque entreprise.
-- Les horodatages (journal d'audit, pièces jointes, inventaires, exports) et le « jour » des alertes
-- suivent le fuseau choisi par l'entreprise. Valeur par défaut : Dakar, soit le comportement d'avant.
alter table public.tenants add column if not exists time_zone text not null default 'Africa/Dakar';
alter table public.tenants drop constraint if exists tenants_time_zone_check;
-- Nom de fuseau IANA (ex. Africa/Dakar, Europe/Paris, America/Toronto). L'application vérifie aussi qu'il existe.
alter table public.tenants add constraint tenants_time_zone_check
  check (time_zone ~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+\-]+){1,2})$' and length(time_zone) <= 64);
-- Pays de l'entreprise (code ISO à 2 lettres, ex. SN, FR, CA) : choisi à l'inscription, il détermine le fuseau proposé.
alter table public.tenants add column if not exists country text;
alter table public.tenants drop constraint if exists tenants_country_check;
alter table public.tenants add constraint tenants_country_check check (country is null or country ~ '^[A-Z]{2}$');
-- L'administrateur de l'entreprise peut les modifier (Paramètres), comme les autres réglages.
grant update (time_zone, country) on public.tenants to authenticated;
