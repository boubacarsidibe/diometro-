-- 0009 : un essai a toujours une date de fin (sinon il ne passe jamais en lecture seule).
-- Les essais existants sans date reçoivent 30 jours à partir de leur création.
update public.tenants set plan_expires_at = (created_at::date + 30)
 where plan = 'essai' and plan_expires_at is null;
alter table public.tenants add constraint tenants_essai_avec_echeance
  check (plan <> 'essai' or plan_expires_at is not null);
