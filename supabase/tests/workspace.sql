-- Run with psql -v ON_ERROR_STOP=1 against a disposable Supabase database.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'other@example.invalid');

insert into auth.identities (user_id, provider, provider_id, identity_data) values
  ('00000000-0000-4000-8000-000000000001', 'google', 'test-owner', '{"sub":"test-owner"}'),
  ('00000000-0000-4000-8000-000000000002', 'google', 'test-other', '{"sub":"test-other"}');

insert into catlx_private.owner (user_id, google_subject)
  values ('00000000-0000-4000-8000-000000000001', 'test-owner');
insert into public.catlx_workspace (environment) values ('preprod');

set local role anon;
do $$
begin
  begin
    perform payload from public.catlx_workspace;
    raise exception 'Anonymous read was allowed';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.catlx_workspace set revision = 1;
    raise exception 'Anonymous write was allowed';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{
  "sub":"00000000-0000-4000-8000-000000000002",
  "is_anonymous":false,"app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]
}', true);
do $$
begin
  if exists (select from public.catlx_workspace) then
    raise exception 'Another Google account could read the workspace';
  end if;
  update public.catlx_workspace set revision = 1;
  if found then
    raise exception 'Another Google account could update the workspace';
  end if;
  begin
    update catlx_private.owner set google_subject = 'test-other';
    raise exception 'An authenticated account could change the owner';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{
  "sub":"00000000-0000-4000-8000-000000000001",
  "is_anonymous":false,"app_metadata":{"provider":"google"},"amr":[{"method":"password"}]
}', true);
do $$
begin
  if exists (select from public.catlx_workspace) then
    raise exception 'An owner session without OAuth was accepted';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{
  "sub":"00000000-0000-4000-8000-000000000001",
  "is_anonymous":false,"app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]
}', true);
do $$
begin
  if not exists (select from public.catlx_workspace where environment = 'preprod' and revision = 0) then
    raise exception 'Owner could not read the preprod workspace';
  end if;
  if exists (select from public.catlx_workspace where environment = 'production') then
    raise exception 'The preprod workspace was read as production';
  end if;

  update public.catlx_workspace
    set payload = jsonb_set(payload, '{ratings}', '[{"id":"fictional-rating"}]'), revision = 1
    where environment = 'preprod' and revision = 0;
  if not found then
    raise exception 'Owner could not save a fictional rating';
  end if;

  update public.catlx_workspace set revision = 1 where environment = 'preprod' and revision = 0;
  if found then
    raise exception 'A stale revision overwrote the owner''s changes';
  end if;

  if not exists (select from public.catlx_workspace where payload -> 'ratings' @> '[{"id":"fictional-rating"}]') then
    raise exception 'The rating was not persisted';
  end if;
  begin
    update public.catlx_workspace set environment = 'production';
    raise exception 'An application session changed the environment';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
update auth.identities set provider_id = 'replaced-google-subject' where provider_id = 'test-owner';
set local role authenticated;
do $$
begin
  if exists (select from public.catlx_workspace) then
    raise exception 'The owner remained authorized after their Google identity changed';
  end if;
end;
$$;

rollback;
