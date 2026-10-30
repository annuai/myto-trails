# Places (gazetteer)

`../places.json` holds India's gazetteer. Each entry may carry `country` (ISO code); when absent it is India.

To add a country, load its places from **GeoNames** (https://www.geonames.org/, licence CC BY 4.0: credit must be shown, and
the app's credits screen does) with `country` set, after the country's states exist (`seedCountry`) and before enabling it.
Do not import places for a country that is still "coming soon".
