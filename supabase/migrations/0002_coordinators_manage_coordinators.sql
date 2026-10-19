-- Un coordinateur (rôle « responsable ») gère les comptes des autres coordinateurs
-- et des consultants de son entreprise. Il ne peut ni toucher aux administrateurs,
-- ni attribuer le rôle administrateur (USING sur l'ancienne ligne, WITH CHECK sur la nouvelle).
create policy profiles_update_coordinator on public.profiles for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() = 'responsable' and role <> 'admin')
  with check (tenant_id = public.auth_tenant() and role <> 'admin');

-- Les politiques permissives se combinent par OU, y compris leurs WITH CHECK : la politique
-- administrateur doit donc exiger le rôle admin aussi sur la NOUVELLE ligne, sinon elle
-- autoriserait un coordinateur à se promouvoir.
drop policy profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() = 'admin')
  with check (tenant_id = public.auth_tenant() and public.auth_role() = 'admin');
