create function catlx_private.guard_passage_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-client-info'
     is distinct from 'catlx-workspace/2'
     and (coalesce(old.payload -> 'passages', '[]'::jsonb) <> '[]'::jsonb
       or coalesce(old.payload -> 'conditions', '[]'::jsonb) <> '[]'::jsonb
       or coalesce(new.payload -> 'passages', '[]'::jsonb) <> '[]'::jsonb
       or coalesce(new.payload -> 'conditions', '[]'::jsonb) <> '[]'::jsonb) then
    raise sqlstate 'PT409' using message = 'catlx_workspace_upgrade_required';
  end if;
  return new;
end;
$$;

revoke all on function catlx_private.guard_passage_writes() from public, anon, authenticated, service_role;

create trigger catlx_workspace_guard_passages
before update of payload on public.catlx_workspace
for each row execute function catlx_private.guard_passage_writes();
