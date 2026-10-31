# Universal links (invites and trail pages opening in the app)

Status: the website half is in place; the app half needs a native build.

**Done on the website:** `apps/web/public/.well-known/apple-app-site-association` names the app (team `42XYUS7TVE`, bundle `com.myto-moto.myto`) for `/join/*` only, and is served as JSON. `/join/<code>` is the one https path the app has a screen for; `/trails/<slug>` is `/trail/<slug>` in the app and needs a redirect screen first. Trail pages show an "Open in the Myto Moto app" link on phones (`myto://trail/<slug>`).

**Not done, and why:** a link only opens the app when the app is built with the Associated Domains entitlement `applinks:<the site's host>`. That changes the iOS project (`ios/MytoMoto/MytoMoto.entitlements`) and needs a new build, so it is left for a build you make and test on a phone. Which host to list (moto-trails.com, or the Vercel address while testing) is your call. Until then the links open in the browser, and the `myto://` links on the join and route pages are the way into the app.

**Android** needs `/.well-known/assetlinks.json` with the app's signing certificate fingerprint, which is not in this repository. Not done.

**Check once built:** open `https://<host>/join/ABC234` from Messages on a phone with the app installed; it should open the app, not Safari.

**Existing dead link:** the shared-route page (`apps/web/src/app/route/[id]/page.tsx`) offers "Open in Myto" (`myto://route/<id>`), but the app has no `route/[id]` screen, so the app opens on a not-found screen. Either add a screen that opens a shared route (the sign-in-free `GET /shared-routes/{id}` endpoint exists) or remove the button.
