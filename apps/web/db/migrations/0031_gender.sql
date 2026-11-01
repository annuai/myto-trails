-- A private gender (male, female, other; null is "prefer not to say"), set from the app or the website. It is never shown
-- to anyone. `is_woman` stays as the column women-only clubs read and always equals (gender = 'female'), so the club
-- code does not change.

alter table app_user add column gender text check (gender in ('male', 'female', 'other'));
update app_user set gender = 'female' where is_woman;
