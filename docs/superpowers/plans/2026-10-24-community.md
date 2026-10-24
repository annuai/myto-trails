# Community Implementation Plan (condensed)

> Executed inline, test-first, with a fresh review per stage. Autonomous run: decisions are recorded as rulings in the final report.

**Goal:** Riders can say "I've ridden here", comment on trails, ask other riders a question and (if they agree) share a phone number that is revealed once and for a short time, form groups (including women-only groups) with invite links and email invites, and plan rides together. No real-time chat.

**Source:** the owner's brief (this conversation) and the recommendations accepted in it.

## Decisions
- **Declaration, not date of birth.** At first sign-in a rider must tick: "I am 18 or older and hold a valid driving licence". Only the time of the declaration is stored. Nothing is shown publicly about it. Without it, no community action is possible (enforced in the services, not only the UI).
- **Private by default.** At the same step the rider chooses whether to appear on the "ridden here" lists and be contactable. Private riders still count in totals.
- **"I've ridden here"** is one record per rider per trail, optionally with month and year, bike and a short note. It is self-reported and never used as access verification.
- **Comments** need a sign-in and the declaration; plain text; first two comments of a new member wait for a moderator; rate limits; report and hide; condition tags help moderators; a note says comments are not permission to ride.
- **Asking a rider:** only riders who made their profile public can be asked. One pending question per pair, a daily limit, blocking, and an expiry. The rider answers in text (one question, one answer, no chat).
- **Phone sharing:** only the rider being asked can offer their number, only in answer to a question. The number is encrypted at rest (AES-GCM, key from `CONTACT_SECRET`), shown to the asker only after an explicit "Reveal" click, for 5 minutes (a visible countdown, with a copy button and a contact-card download), then deleted for good. An unrevealed share expires after 24 hours and is deleted too. Nobody else, including moderators, can read it; only the fact of sharing is logged. Defaults live in one constants file.
- **Groups** (public or private, optionally women-only), invites by expiring link (use limit, revocable) or by email, a members-only post-and-reply feed, ride plans with Going/Maybe replies, an optional members-only external chat link (https only). Email notifications only; no real-time features.
- **Women-only:** eligibility is a private, self-declared profile setting; admins approve each request; the member list is visible to members only; a written policy and women moderators are a launch requirement owned by the owner (blocker in the final report).
- **Bike photos** on rider profiles use the existing image pipeline; optional, shown only for public profiles.

## Stages
1. **C1 Members, ridden, comments:** migration, welcome flow and gating, ridden service and panel, comments with moderation, report queue.
2. **C2 Ask a rider and contact sharing:** questions, answers, blocks, encrypted time-limited phone share, notifications.
3. **C3 Groups:** groups, membership and requests, invites (link and email), feed, ride plans and replies, women-only rules.
4. **C4 Profiles and bike photos.**

## Global constraints
- Every community write requires a session, the declaration and a rate limit; all ids are scoped to the caller; other users' content is read only through public-safe views or functions.
- No HTML from users; text is escaped everywhere; links in text are not made clickable.
- Reporter identity is never shown to the reported person; moderator actions are audited like the rest.

## Review focus (per stage)
1. Anything a signed-in but undeclared or blocked user can still do.
2. Privacy: private riders appearing in lists, counts, emails, APIs or comments; phone numbers anywhere but the one reveal.
3. Abuse: spam, harassment via questions or invites, enumeration of members or emails, invite-link guessing.
4. Women-only groups: how the member list, existence and join requests leak.
5. Moderation: every hide, remove and restore is audited and reversible.
