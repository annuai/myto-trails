# M6 moderation and publication Implementation Plan (condensed)

> Executed inline, test-first, one fresh whole-branch review at the end. Autonomous run: decisions are recorded as rulings in the final report.

**Goal:** Moderators can work a queue of submitted trails, decide (approve, request changes, reject, publish with limits), verify access with an expiry, resolve reports and set conditions, with every action in an append-only audit log; contributors are told the outcome; trails appear on the public site when published.

**Spec:** docs/11 §3 (policy, checklist, reason codes, two-person rule), docs/04 §7, docs/06 (moderation_record, audit_log, access_assessment), docs/12 M6.

## Decisions
- **Roles:** `user_role` already has `moderator` and `admin`. Every moderation function takes the acting user id and checks the role inside the same transaction; pages return 404 (not 403) to everyone else so the area is not discoverable. Granting roles is admin-only and is audited. No MFA yet (needs an auth provider): recorded as a blocker for beta.
- **Audit log and decision records are append-only in the database:** triggers refuse UPDATE and DELETE; the audit row is written in the same transaction as the action it describes, so an action without a log entry cannot commit.
- **Publishing** sets `trail.lifecycle = published`, `published_revision_id`, `first_published_at`, revision `state = approved`, resolves the district from the contributor's text (creating the district region only now, by a moderator), and the moderator chooses `sensitivity` (a sensitive trail needs a public point). Access assessments are appended (never edited) so history stays.
- **Two-person rule:** a trail whose access class is `restricted`, or that carries the `protected_area` restriction, needs approvals from two different moderators/admins before it publishes. The first approval is recorded; the second publishes. Nobody can give both.
- **Publish with limits:** publishes without a GPX (the route's `gpx_file` is retired) and, when asked, at reduced precision is not built (sensitive trails already hide geometry).
- **Private/no-access and unknown access:** `private_no_access` cannot be approved (reject or admin stub only, stub not built); `unknown` publishes only as Unverified.
- **Access verification** by a moderator appends an assessment with level `moderator_verified` (or `officially_verified` with a document/written-confirmation evidence row and an authority name), `verified_at`, and a default `valid_until` (12 months; 6 seasonal; 3 permission-based). The domain rules already degrade expired verification at read time; the sweep lists what is due so nothing silently lapses.
- **Reports:** accepting a closure report creates a `condition_event` (source `report`), other types are triaged and resolved with a note; the reporter is told the outcome by email.
- **Notifications:** contributor emails (approved, changes requested, rejected) through the existing `EmailSender`; emailing savers of a changed trail is left to the Saved page's change badges (stage 2 notifications are out of scope).
- **Revalidation:** every publish, unpublish, verification or condition change calls `updateTag` for the trail and the listings.

## Global constraints
- All actions: role check, state check (illegal transitions refused), audit entry, in one transaction.
- Moderator-only data (permission contact, evidence, contributor email, feedback drafts) is read only through moderation functions, never public views.
- Reason codes are a closed list (docs/11): duplicate, insufficient_information, unverifiable_access, private_property, protected_area_risk, unsafe_content, inaccurate_gpx, copyright, spam.
- A contributor cannot moderate their own submission.

## Tasks
1. **Schema 0012:** `moderation_record`, `audit_log` with append-only triggers, submission columns for first approver and claim; DB tests (append-only, anon closed).
2. **Moderation service:** `requireModerator`, `listQueue`, `getReview`, `requestChanges`, `reject`, `approve` (incl. two-person rule, publish, district resolution), `verifyAccess`, `unpublish`; lifecycle state-machine tests, audit completeness test.
3. **Reports and conditions:** `listReports`, `resolveReport` (accept closure → condition event), `setCondition`; expiry-sweep query `listDueForRecheck`.
4. **Users:** `grantRole`/`revokeRole` (admin), `suspendUser` (blocks sign-in and sessions); tests.
5. **Notifications:** contributor emails on decisions.
6. **UI:** `/moderate` queue, `/moderate/[id]` review panel with the checklist and actions, `/moderate/reports`, `/moderate/due`, `/moderate/users`; role-gated; actions via server actions with revalidation.
7. **Verification and review:** end-to-end moderation journey in the browser against the dev database; fresh review; fixes; push.

## Review focus
1. Privilege: every service function and page refuses non-moderators, suspended moderators, and a moderator acting on their own submission.
2. Two-person rule bypass: same person approving twice, concurrent approvals, admin shortcuts, approving after the claim changed.
3. State machine: approving a withdrawn/rejected/already approved submission, double decisions, concurrent decisions on one submission.
4. Audit completeness: every mutating function writes exactly one audit row; rollback leaves none; log cannot be edited through the app role.
5. Data exposure: contributor email, permission contact and evidence never reach public views, public pages, emails to other users, or the contributor's own status page beyond what they wrote.
