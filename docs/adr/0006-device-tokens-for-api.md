# ADR 0006: Device tokens for the public API

Status: accepted (autonomous run; revisit when the companion app exists)

## Context
docs/14 plans OAuth with PKCE for the companion app and revocable device tokens for Myto Navi. Neither client exists yet and no identity provider is configured.

## Decision
Ship `/api/v1` with revocable device tokens created by a signed-in rider (hashed at rest, shown once, scoped to `saved` and `write:submission`, at most ten active). Public reads need no token. OAuth can be added later as another way to obtain a bearer token; endpoints and scopes do not change.

## Consequences
Riders copy a token into the device by hand, which is acceptable for Navi and for early testing. A leaked token is revocable from the account page. No cookies are read by `/api/v1`, so cross-site request forgery does not apply.
