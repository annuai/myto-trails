-- A pre-ride check item can have a cover picture (art id, "<name>/<slot>"), shown on its card. Walk-round and Papers have no guide to borrow one from.
alter table fixit_check_item add column cover text check (cover is null or cover ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$');
