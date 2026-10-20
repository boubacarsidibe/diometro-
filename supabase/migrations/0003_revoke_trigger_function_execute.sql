-- Les fonctions de trigger n'ont pas à être appelables via l'API REST (/rest/v1/rpc/...).
-- Les triggers continuent de fonctionner : le droit EXECUTE n'est vérifié qu'à la création du trigger.
revoke execute on function
  public.guard_profile(),
  public.write_audit(),
  public.check_intervention_tenant(),
  public.touch_updated_at(),
  public.guard_tenant_fk()
from public, anon, authenticated;
