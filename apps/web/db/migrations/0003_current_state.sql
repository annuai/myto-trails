-- Keeps the denormalised "current" fields on trail in step with the latest assessment and condition event.

create function refresh_trail_current(p_trail_id uuid) returns void
language sql
as $$
  update trail t set
    access_class_current = coalesce(
      (select a.access_class from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1), 'unknown'),
    access_verification_level_current = coalesce(
      (select a.level from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1), 'unverified'),
    access_verified_until =
      (select a.valid_until from access_assessment a where a.trail_id = t.id order by a.created_at desc, a.id desc limit 1),
    condition_current = coalesce(
      (select c.status from condition_event c where c.trail_id = t.id order by c.effective_from desc, c.recorded_at desc, c.id desc limit 1), 'unknown'),
    updated_at = now()
  where t.id = p_trail_id;
$$;

create function trigger_refresh_trail_current() returns trigger
language plpgsql
as $$
begin
  perform refresh_trail_current(new.trail_id);
  return new;
end
$$;

create trigger access_assessment_refresh after insert or update on access_assessment
  for each row execute function trigger_refresh_trail_current();
create trigger condition_event_refresh after insert or update on condition_event
  for each row execute function trigger_refresh_trail_current();
