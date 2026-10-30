-- Two restriction tags that are not specific to one country. They describe a place; the verdict still comes from access_class.
alter table access_assessment drop constraint if exists access_assessment_restrictions_check;
alter table access_assessment add constraint access_assessment_restrictions_check
  check (restrictions <@ array['forest_dept', 'protected_area', 'private_estate', 'seasonal_ban', 'permit', 'no_motor_vehicles', 'local_ordinance', 'public_land_closure']);
