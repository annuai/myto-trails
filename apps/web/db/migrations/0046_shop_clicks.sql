-- How often riders tap through from the app to the shop, per product, per place in the app, per day. Only a count:
-- no rider, device, location or time of day is stored, so there is nothing here that can identify anyone.
create table shop_click (
  product_slug text not null check (product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(product_slug) <= 80),
  surface text not null check (surface in ('home', 'shop', 'trip')),
  day date not null,
  count integer not null default 1 check (count > 0),
  primary key (product_slug, surface, day)
);
