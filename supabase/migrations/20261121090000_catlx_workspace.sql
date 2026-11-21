create schema catlx_private;

revoke all on schema catlx_private from public, anon, authenticated, service_role;
grant usage on schema catlx_private to authenticated;

create table catlx_private.owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_subject text not null check (google_subject <> '')
);

revoke all on table catlx_private.owner from public, anon, authenticated, service_role;

create function catlx_private.is_google_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'is_anonymous', 'true') = 'false'
    and auth.jwt() -> 'app_metadata' ->> 'provider' = 'google'
    and auth.jwt() -> 'amr' @> '[{"method":"oauth"}]'::jsonb
    and exists (
      select 1
      from catlx_private.owner as owner
      join auth.identities as identity
        on identity.user_id = owner.user_id
        and identity.provider = 'google'
        and identity.provider_id = owner.google_subject
      where owner.user_id = auth.uid()
    );
$$;

revoke all on function catlx_private.is_google_owner() from public, anon, authenticated, service_role;
grant execute on function catlx_private.is_google_owner() to authenticated;

create table public.catlx_workspace (
  singleton boolean primary key default true check (singleton),
  environment text not null check (environment in ('preprod', 'production')),
  revision integer not null default 0 check (revision >= 0),
  write_id uuid,
  payload jsonb not null default '{
    "projects": [],
    "evaluators": [],
    "studies": [],
    "mtes": [],
    "ratings": [],
    "pairwiseComparisons": []
  }'::jsonb,
  constraint workspace_collections check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['projects', 'evaluators', 'studies', 'mtes', 'ratings', 'pairwiseComparisons']
    and jsonb_typeof(payload -> 'projects') = 'array'
    and jsonb_typeof(payload -> 'evaluators') = 'array'
    and jsonb_typeof(payload -> 'studies') = 'array'
    and jsonb_typeof(payload -> 'mtes') = 'array'
    and jsonb_typeof(payload -> 'ratings') = 'array'
    and jsonb_typeof(payload -> 'pairwiseComparisons') = 'array'
  )
);

alter table public.catlx_workspace enable row level security;
revoke all on table public.catlx_workspace from public, anon, authenticated, service_role;
grant select on table public.catlx_workspace to authenticated;
grant update (payload, revision, write_id) on table public.catlx_workspace to authenticated;

create policy "Google owner can read the workspace"
  on public.catlx_workspace for select to authenticated
  using ((select catlx_private.is_google_owner()));

create policy "Google owner can update the workspace"
  on public.catlx_workspace for update to authenticated
  using ((select catlx_private.is_google_owner()))
  with check ((select catlx_private.is_google_owner()));
