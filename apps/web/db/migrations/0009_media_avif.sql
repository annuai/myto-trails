-- AVIF variants live next to the WebP ones in media.variants (width -> URL); both are produced by the image pipeline.
alter table media add column variants_avif jsonb not null default '{}';
