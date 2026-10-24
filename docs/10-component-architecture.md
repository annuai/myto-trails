# 10 — Component architecture

Planning document only; the tree below is a *proposal* for a future repository.

## 1. Principles
1. **Layers import downward only:** `app` → `features` → `ui` → `tokens`. `server` is reachable from `app` and `features` only through typed loader functions.
2. **`ui/` knows nothing about trails.** It contains design-system primitives. If a component mentions a trail, it belongs in `features/`.
3. **Features own their domain UI, hooks and schemas.** A feature can be deleted without touching others.
4. **Pages compose, they don't implement.** A page file is ≤ ~60 lines: fetch via a loader, arrange feature components.
5. **Business rules live in `domain/` as pure functions** (e.g. "is GPX downloadable?", "effective verification level"), unit-tested, used by both server and UI.
6. **Presentational vs container:** components receive data via props; data fetching in server components or loaders.

## 2. Proposed folder structure

Because a companion app and Navi integration will follow the web MVP (doc 14), the repository is a **monorepo**:

```
moto-trails/
├─ apps/
│  ├─ web/                       # this document's tree (below)
│  └─ mobile/                    # Trails companion app (companion stage; framework decided after the recording spike)
├─ packages/
│  ├─ tokens/                    # shared design tokens (CSS variables + JSON for native)
│  ├─ domain/                    # pure TypeScript rules and Zod schemas shared by web, API and app
│  └─ api-client/                # typed client generated from the OpenAPI description
└─ docs/                         # these documents
```
Navi's own app (physical-control UI) lives in the Navi team's repository; it consumes `/api/v1` and the GPX export format, and may reuse `tokens`.

The web app tree:

```
apps/web/
├─ src/
│  ├─ app/                       # Next.js routes only (composition)
│  │  ├─ (public)/               # home, trails, regions, guidelines…
│  │  │  ├─ trails/[slug]/
│  │  │  ├─ trails/page.tsx
│  │  │  ├─ regions/[state]/[district]/
│  │  │  └─ donate/ · about/ · guidelines/
│  │  ├─ (account)/              # saved, contributions, profile, submit
│  │  ├─ (moderation)/moderate/
│  │  └─ api/                    # gpx download, upload-url, sitemap, og; v1/ = public API for apps and Navi (companion stage)
│  ├─ features/
│  │  ├─ discovery/              # SearchCombobox (trails/places/regions), NearMeButton, RadiusChips, TravelTime, TrailFilters, TrailList, TrailRow,
│  │  │                          # ActiveFilterList, RegionSelector, MapListToggle
│  │  ├─ map/                    # MapView, MapControls, TrailMarkerLayer, RouteLayer, UserLocationMarker, MapAttribution
│  │  ├─ trail/                  # TrailHeader, GoNoGoStrip, AccessStatus, ConditionStatus, VerificationBadge, TerrainTags,
│  │  │                          # DifficultyIndicator, RouteMap, ElevationProfile, GpxDownload, TrailGallery,
│  │  │                          # SafetyInformation, ContributorCredit, LastVerified, ReportIssue
│  │  ├─ saved/                  # SavedList, SavedItem, SaveButton
│  │  ├─ submission/             # SubmissionWizard, steps/*, LocationPicker, GpxUploader, ImageUploader, RoutePreview,
│  │  │                          # AccessInformationForm, SubmissionReview, DuplicateWarning
│  │  ├─ contributions/          # ContributionList, SubmissionStatus, FeedbackThread
│  │  ├─ account/                # SignInDialog, ProfileForm, DataExport
│  │  └─ moderation/             # ModerationQueue, ReviewPanel, VerificationPanel, ReportManagement, UserManagement, AuditLogView
│  ├─ ui/                        # design-system primitives
│  │  ├─ Button/ IconButton/ Link/ TextField/ Select/ Combobox/ Checkbox/ Switch/ FilterChip/
│  │  ├─ StatusBadge/ Notice/ DataPair/ Tabs/ Dialog/ Sheet/ Toast/ Pagination/ Stepper/ FileDrop/
│  │  ├─ Skeleton/ EmptyState/ ErrorState/ Breadcrumbs/ PageContainer/ FormField/
│  │  └─ icons/
│  ├─ layout/                    # SiteHeader, SiteNavigation, MobileTabBar, SiteFooter
│  ├─ domain/                    # pure TS: access rules, difficulty, status derivation, units, slugs, zod schemas
│  ├─ server/
│  │  ├─ queries/                # read functions (typed), one file per aggregate
│  │  ├─ actions/                # server actions: submit, save, report, moderate
│  │  ├─ jobs/                   # gpx-process, image-process, expiry-sweep, notify
│  │  ├─ auth/                   # session, roles, guards
│  │  ├─ storage/                # interface + provider implementation
│  │  └─ db/                     # client, migrations (SQL), RLS policies, seeds
│  ├─ map-styles/                # provider-agnostic style definitions
│  ├─ styles/                    # tokens.css (shared), trails.css (layer), globals
│  └─ lib/                       # small utilities (format, url-state, analytics)
├─ e2e/                          # Playwright specs
└─ tooling/                      # lint rules, scripts
```

Each component folder: `ComponentName/ComponentName.tsx`, `ComponentName.test.tsx` (only where behaviour warrants), `README.md` (short), and `index.ts`.

## 3. Component hierarchy (key screens)

```
TrailDetailPage
├─ Breadcrumbs
├─ TrailHeader ── SaveButton
├─ GoNoGoStrip
│  ├─ AccessStatus ── StatusBadge
│  ├─ ConditionStatus ── StatusBadge
│  ├─ VerificationBadge ── LastVerified
│  ├─ DataPair × n (distance, duration, gain, difficulty)
│  └─ GpxDownload · ReportIssue
├─ Notice (when access ≠ public or condition ≠ open)
├─ RouteMap ── MapView ── RouteLayer, MapControls, MapAttribution
├─ ElevationProfile (chart + table)
├─ TrailSummary · TerrainTags · DifficultyIndicator · SeasonStrip
├─ SafetyInformation
├─ TrailGallery
├─ AccessDetails (sources count, instructions)
├─ ContributorCredit · RevisionHistory
└─ RelatedTrails ── TrailRow

ExplorePage
├─ TrailSearch · TrailFilters · ActiveFilterList · SortSelect · MapListToggle
├─ TrailList ── TrailRow × n · Pagination · EmptyState
└─ DiscoveryMap ── MapView ── TrailMarkerLayer · MapControls
```

## 4. Component responsibilities (selected)

| Component | Responsibility | Must not |
|---|---|---|
| `StatusBadge` | Render glyph + label + optional date from a status enum | Decide *what* a status is |
| `AccessStatus`/`ConditionStatus` | Map domain enums to `StatusBadge` props and copy | Fetch data |
| `GpxDownload` | Show button/disabled-with-reason from `canDownloadGpx(trail)` (domain) | Duplicate the rule in JSX |
| `MapView` | Own the map instance, lifecycle, attribution, fallbacks | Know about trails or filters |
| `TrailMarkerLayer` | Turn a list of start points into a layer, emit select events | Navigate |
| `SubmissionWizard` | Step routing, draft autosave, cross-step state | Contain field markup (steps do) |
| `GpxUploader` | Upload, show progress, display validation report | Parse GPX in the browser beyond a size/XML sniff |
| `ReviewPanel` | Compose moderator tabs and actions | Contain business rules (calls actions) |

## 5. Separation of frontend and backend logic
- UI components never talk to the database or storage SDKs.
- `server/queries` return plain, serialisable DTOs shaped for the UI; the DTO for public pages is a different type from the DTO for moderators (prevents accidental leakage of evidence or contacts).
- `server/actions` validate with the `domain` Zod schemas, authorise, perform the write, write audit rows, and trigger revalidation.
- `domain/` has no framework imports; it is the shared contract.
- A future public API wraps `server/queries` and `server/actions` without UI changes.

## 6. Design token organisation
`styles/tokens.css` (shared primitives and semantic roles, Tailwind v4 `@theme`) + `styles/trails.css` (accent, status, radii, data type, map tokens). Components use utility classes mapped to semantic tokens (`bg-surface`, `text-muted`, `border-hairline`); raw hex values are lint-banned outside `styles/`.

## 7. Naming conventions
- Components: `PascalCase`, named for the thing, not its look (`AccessStatus`, not `RedBadge`). Folders and files match the component name.
- Hooks `useThing`; server functions verbs (`getTrailBySlug`, `submitRevision`); jobs `process-gpx`.
- Domain enums are `snake_case` strings in the DB and a typed union in TS; one source (`domain/enums.ts`).
- CSS custom properties `--color-*`, `--space-*`, `--radius-*`, `--status-*`, `--map-*`.
- Test files adjacent: `*.test.ts(x)`; e2e specs named by journey (`discover-trail.spec.ts`).
- URLs lowercase kebab-case; query params lowercase, comma-separated multi-values.

## 8. Testing approach by layer
`domain/`: exhaustive unit tests (access/status rules, GPX stats, slug generation). `server/`: integration tests against a Postgres+PostGIS test DB including RLS tests. `ui/` and features: component tests only for interactive primitives (combobox, dialog, file drop, wizard). E2E (Playwright): the seven journeys, mobile and desktop viewports, with axe accessibility checks and visual snapshots of key pages.

## 9. Documentation approach
Each folder has a short `README.md`; ADRs (`docs/adr/NNNN-title.md`) record decisions such as "subdomain vs path", "Supabase vs Neon"; a "how to add a filter", "how to add a status value" and "how to add a region" runbook is written in milestone 1 so a new developer or designer can extend the system.
