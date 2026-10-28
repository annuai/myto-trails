-- Deleting an account must not be blocked by, or destroy, records that other people rely on. These five links point at
-- the rider who filed a report, started a club, granted a role, resolved a report or decided a join request. They become
-- "no one" when that rider's account is deleted; the report, the club and the decision stay.

create function pg_temp.relax_user_fk(tbl regclass, col name) returns void language plpgsql as $$
declare
  fk name;
begin
  select c.conname into fk
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.conrelid = tbl and c.contype = 'f' and c.confrelid = 'app_user'::regclass and array_length(c.conkey, 1) = 1 and a.attname = col;
  if fk is not null then
    execute format('alter table %s drop constraint %I', tbl, fk);
  end if;
  execute format('alter table %s alter column %I drop not null', tbl, col);
  execute format('alter table %s add foreign key (%I) references app_user (id) on delete set null', tbl, col);
end $$;

select pg_temp.relax_user_fk('trail_report', 'reporter_id');
select pg_temp.relax_user_fk('trail_report', 'resolved_by');
select pg_temp.relax_user_fk('club', 'created_by');
select pg_temp.relax_user_fk('club_join_request', 'decided_by');
select pg_temp.relax_user_fk('user_role', 'granted_by');
