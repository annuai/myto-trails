# Versioning

One product version covers the website, the phone app and the shared packages. It is shown in the website footer and at the bottom of the app's You page.

## How to write it

`MAJOR.MINOR.PATCH`, for example `0.8.0` (Semantic Versioning). No `v` in the files, a `v` in the Git tag and in what people see (`v0.8.0`).

## What the numbers mean

Before launch the first number stays `0`, which tells everyone the product is still being built.

| Number | Moves when | Example |
|---|---|---|
| `0.MINOR` | A capability riders can see is finished: a new area, not a tweak | clubs, account deletion |
| `PATCH` | Fixes and polish that add no new capability | a layout fix, a wording fix |
| `0.9.x` | Beta: roadmap milestone M7, hardening done, legal text reviewed, backup restore drill passed | |
| `1.0.0` | Public launch: roadmap milestone M8, registration open | |

After `1.0.0`: `MAJOR` for a break (a change to the public API or to the backup file format that older versions cannot read), `MINOR` for a new capability, `PATCH` for a fix.

## Where we are: 0.8.0

Eight capability groups are built: the public site with discovery and maps (M1, M2), accounts, saved trails and reports (M3), GPX and photos (M4), trail submissions (M5), moderation (M6), the public API (M9), the phone app (M10), and community and privacy (clubs, comments, reminders, backups, account deletion, Terms and Privacy). Hardening and beta (M7) and launch (M8) are what is left, which is why the next planned milestones are `0.9.0` and `1.0.0`.

## How it updates

Commit messages already follow Conventional Commits, and that is what drives the number:

- `feat:` raises `MINOR`; `fix:` raises `PATCH`.
- `feat!:` or a `BREAKING CHANGE:` footer is a break: `MINOR` while the version starts with `0`, `MAJOR` after `1.0.0`.
- `docs:`, `test:`, `chore:`, `refactor:` do not change the version.

**Nothing changes instantly.** A GitHub Action (`.github/workflows/release-please.yml`) keeps one open "release PR" on `main`, listing everything since the last release and the version it would become. Merging that PR is the milestone: it bumps every version file together, writes `CHANGELOG.md`, tags `vX.Y.Z` and creates a GitHub release. Leave it open while work piles up; merge it when a milestone is reached or enough has changed.

To choose the number yourself (for example the beta, or launch), add an empty commit to `main` with the footer `Release-As: 0.9.0` (or `1.0.0`); the release PR then proposes exactly that.

`npm run check:versions` runs in CI and fails if any file drifts from `.release-please-manifest.json`.

## Not handled by this

- **Store build numbers.** App Store and Google Play need a build number that rises on every upload. Set `ios.buildNumber` and `android.versionCode` (or use EAS `autoIncrement`) when the first store build is made.
- **The Xcode project says `1.0`.** `apps/mobile/ios/Myto.xcodeproj` has its own `MARKETING_VERSION`. Run `npx expo prebuild` (or set it) so it follows `app.json` before TestFlight.
- **One repository setting**, needed once for the bot to open its PR: Settings, Actions, General, "Allow GitHub Actions to create and approve pull requests".
