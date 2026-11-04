-- A Fix it picture can belong to no guide: the cover of the "What to carry" card is not a repair. The id keeps the "<name>/<slot>" form ("carry/kit").
alter table fixit_art alter column guide_id drop not null;
