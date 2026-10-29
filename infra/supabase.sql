-- Run once in a new Supabase project's SQL editor. Application data is server-only.
create table if not exists public.seva_records (
  kind text not null check (kind in ('needs','volunteers','assignments','completions','email_outbox')),
  id text not null,
  body jsonb not null,
  version bigint not null default 1,
  primary key (kind,id)
);
alter table public.seva_records enable row level security;
revoke all on public.seva_records from anon, authenticated;
grant all on public.seva_records to service_role;
create index if not exists seva_records_email on public.seva_records ((body->>'email')) where kind='volunteers';
create index if not exists seva_records_status on public.seva_records (kind,(body->>'status'));
create index if not exists seva_records_volunteer on public.seva_records ((body->>'volunteer_id')) where kind='assignments';

create or replace function public.seva_write_transaction(changes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare item jsonb; current_version bigint;
begin
  if jsonb_array_length(changes)>20 then raise exception 'Too many changes'; end if;
  -- Serialize the small pilot's write transactions, then validate every revision.
  perform pg_advisory_xact_lock(73638291);
  for item in select * from jsonb_array_elements(changes) loop
    select version into current_version from public.seva_records
      where kind=item->>'kind' and id=item->>'id';
    if coalesce(current_version,0) <> (item->>'expected_version')::bigint then
      raise exception 'revision_conflict' using errcode='40001';
    end if;
  end loop;
  for item in select * from jsonb_array_elements(changes) loop
    insert into public.seva_records(kind,id,body,version)
      values(item->>'kind',item->>'id',item->'body',(item->>'expected_version')::bigint+1)
    on conflict(kind,id) do update set body=excluded.body,version=excluded.version;
  end loop;
end $$;
revoke all on function public.seva_write_transaction(jsonb) from public,anon,authenticated;
grant execute on function public.seva_write_transaction(jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('seva-media','seva-media',false,10485760,array['image/jpeg','image/png','image/webp','audio/webm','video/webm','audio/ogg','audio/wav','audio/mpeg','audio/mp4'])
on conflict(id) do nothing;
-- No public Storage policies: the backend uploads and issues short-lived signed reads.
