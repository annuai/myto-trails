# Pull-down quotes

The lines shown when a rider pulls down on the Dash live in the `ride_quote` table (migration `0042_ride_quotes.sql`, seeded with the lines that were bundled in the app).
`GET /api/v1/quotes` serves the published ones as `{ "quotes": [...] }`, cached at the edge for a day. The app asks on first open and then at most once a week
(and retries on the next open or return to the app after a failure), keeps the set on the phone, and uses the lines bundled in `apps/mobile/src/data/rideQuotes.ts` until it has fetched.

**Add a quote** (no deploy, no app release; phones pick it up within about 8 days):

```sql
insert into ride_quote (text, sort) values ('Your new line.', 2000);
```

Text is 3 to 160 characters, no leading or trailing space, and unique. Lines show in `sort` order but are drawn at random. **Retire one:** `update ride_quote set published = false where text = '...'`.

The migration has to be applied once (`npm run db:migrate` in `apps/web`) before the endpoint works; until then the app keeps using the bundled lines.
