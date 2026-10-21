-- Pièces jointes (certificats, fiches de vie, procédures, photos) : métadonnées + bucket privé.

create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  instrument_id   uuid not null references public.instruments (id) on delete cascade,
  kind            text not null default 'autre'
                  check (kind in ('certificat', 'fiche_de_vie', 'procedure', 'photo', 'autre')),
  filename        text not null check (char_length(filename) between 1 and 200),
  mime            text not null check (mime in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes      int not null check (size_bytes between 1 and 10485760),
  storage_path    text not null unique check (storage_path like tenant_id::text || '/%'),
  uploaded_by     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);
create index on public.attachments (instrument_id);

create function public.check_attachment_tenant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.instruments i where i.id = new.instrument_id and i.tenant_id = new.tenant_id) then
    raise exception 'Instrument inconnu pour cette entreprise';
  end if;
  return new;
end $$;
revoke all on function public.check_attachment_tenant() from public, anon, authenticated;
create trigger attachments_tenant_check before insert on public.attachments
  for each row execute function public.check_attachment_tenant();
create trigger attachments_audit after insert or delete on public.attachments
  for each row execute function public.write_audit();

alter table public.attachments enable row level security;
alter table public.attachments force row level security;
revoke all on public.attachments from anon, authenticated;
create policy attachments_select on public.attachments for select to authenticated
  using (tenant_id = public.auth_tenant());
create policy attachments_insert on public.attachments for insert to authenticated
  with check (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable') and uploaded_by = auth.uid());
create policy attachments_delete on public.attachments for delete to authenticated
  using (tenant_id = public.auth_tenant() and public.auth_role() in ('admin', 'responsable'));
grant select, delete on public.attachments to authenticated;
grant insert (tenant_id, instrument_id, kind, filename, mime, size_bytes, storage_path, uploaded_by) on public.attachments to authenticated;

-- Bucket privé : 10 Mo max, types autorisés. Chemin imposé : <tenant_id>/<instrument_id>/<uuid>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy attachments_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_tenant()::text);
create policy attachments_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_tenant()::text
              and public.auth_role() in ('admin', 'responsable'));
create policy attachments_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.auth_tenant()::text
         and public.auth_role() in ('admin', 'responsable'));
