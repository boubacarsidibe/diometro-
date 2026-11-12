-- ════════════════════════════════════════════════════════════════════════════
-- 0010 — Second facteur par code e-mail (6 chiffres, 10 minutes, 5 essais).
--
-- Niveau de protection inchangé côté base : toutes les règles d'accès exigeaient « aal2 »
-- (application d'authentification). Elles exigent désormais public.mfa_ok() :
--   aal2  OU  un code e-mail validé pour CETTE session (session_id du jeton).
-- Le code est généré et envoyé par le serveur (clé service_role) : il n'est jamais lisible
-- depuis le navigateur. La base ne stocke qu'une empreinte SHA-256 salée.
-- ════════════════════════════════════════════════════════════════════════════

create table public.mfa_email_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  session_id  uuid not null,
  code_hash   text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  salt        text not null check (char_length(salt) between 16 and 64),
  expires_at  timestamptz not null,
  attempts    integer not null default 0 check (attempts between 0 and 5),
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.mfa_email_codes (user_id, session_id, created_at desc);

-- Aucun accès direct : seules la clé service_role (serveur) et les fonctions ci-dessous y touchent.
alter table public.mfa_email_codes enable row level security;
alter table public.mfa_email_codes force row level security;
revoke all on public.mfa_email_codes from public, anon, authenticated;

-- Méthode préférée de chaque utilisateur (la dernière utilisée avec succès).
alter table public.profiles add column mfa_method text not null default 'email' check (mfa_method in ('email', 'totp'));

-- ── Le second facteur est-il validé pour la session courante ? ─────────────
create function public.mfa_ok() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or exists (
        select 1 from public.mfa_email_codes c
        where c.user_id = auth.uid()
          and c.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
          and c.verified_at is not null
      )
$$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;

-- ── Vérification d'un code (appelée par l'utilisateur connecté, mot de passe validé) ──
-- Résultat : 'ok' | 'invalid' | 'expired' | 'locked' | 'none'. Chaque essai est compté, même faux.
create function public.mfa_email_verify(p_code text) returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  c   public.mfa_email_codes;
  sid text := coalesce(auth.jwt() ->> 'session_id', '');
begin
  if auth.uid() is null or sid = '' then return 'none'; end if;
  select * into c from public.mfa_email_codes
   where user_id = auth.uid() and session_id::text = sid and verified_at is null
   order by created_at desc limit 1
   for update;
  if not found then return 'none'; end if;
  if c.expires_at < now() then return 'expired'; end if;
  if c.attempts >= 5 then return 'locked'; end if;
  update public.mfa_email_codes set attempts = attempts + 1 where id = c.id;
  if coalesce(p_code, '') ~ '^[0-9]{6}$'
     and encode(sha256(convert_to(c.salt || ':' || p_code, 'UTF8')), 'hex') = c.code_hash then
    update public.mfa_email_codes set verified_at = now() where id = c.id;
    return 'ok';
  end if;
  if c.attempts + 1 >= 5 then return 'locked'; end if;
  return 'invalid';
end $$;
revoke all on function public.mfa_email_verify(text) from public, anon;
grant execute on function public.mfa_email_verify(text) to authenticated;

-- ── Mémorise la méthode utilisée (uniquement une fois le second facteur validé) ──
create function public.set_mfa_method(p_method text) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.mfa_ok() then raise exception 'second facteur requis' using errcode = '42501'; end if;
  if p_method not in ('email', 'totp') then raise exception 'méthode inconnue' using errcode = '22023'; end if;
  -- Mise à jour seulement si la méthode change : pas d'entrée d'audit à chaque connexion.
  update public.profiles set mfa_method = p_method where user_id = auth.uid() and mfa_method <> p_method;
end $$;
revoke all on function public.set_mfa_method(text) from public, anon;
grant execute on function public.set_mfa_method(text) to authenticated;

-- ── Les fonctions d'accès acceptent désormais aal2 OU code e-mail validé ──
create or replace function public.auth_tenant() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and public.mfa_ok()
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and public.mfa_ok()
$$;

create or replace function public.auth_write_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.user_id = auth.uid() and p.active and t.status = 'active'
    and (t.plan_expires_at is null or t.plan_expires_at >= current_date)
    and public.mfa_ok()
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
     and public.mfa_ok()
$$;
