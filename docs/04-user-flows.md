# 04 — User flows

## 1. Discovering a trail

```mermaid
flowchart TD
  A[Land on Home or /trails] --> B{Know where?}
  B -- Yes --> C[Search town / district / name]
  B -- No --> D[Browse by region or use filters]
  C --> E[Results: list + map]
  D --> E
  E --> F[Refine filters; URL updates]
  F --> E
  E --> G{No results?}
  G -- Yes --> H[Empty state: relax filters suggestions, nearest trails, submit a trail]
  G -- No --> I[Open trail]
  I --> J[Go/no-go strip]
  J --> K{Access OK and open?}
  K -- Yes --> L[Download GPX / Save]
  K -- Permission required --> M[Read permission details and guidelines, then decide]
  K -- Closed / unknown --> N[See closure info, save to be notified, related trails]
```

Design notes: filter state lives in the URL; "Hide closed" is the default and is shown as a removable chip, not hidden. The result count is always visible and announced to screen readers when it changes.

## 2. Exploring on the map

```mermaid
flowchart TD
  A[Open Map view] --> B[Map fits India or last viewport]
  B --> C[Clusters of trail start points, coloured by shape+label for access]
  C --> D[Pan / zoom: list refreshes to 'trails in this view']
  D --> E[Tap marker: preview card with go/no-go strip]
  E --> F[Open full trail page]
  E --> G[Show route line on map]
  C --> H[Toggle: Search this area / Follow map]
  C --> I[Switch to List: same filters and results]
```

Only trail *start points* (with privacy-adjusted precision where required) are served for the map overview. Full route geometry loads on selection. A text list of "trails in view" is always available and is the accessible equivalent.

## 3. Viewing and downloading a GPX

```mermaid
flowchart TD
  A[Trail page] --> B{GPX available?}
  B -- No --> C[Show why: not provided / withheld for sensitive area / pending]
  B -- Yes --> D{Access class allows download?}
  D -- No --> E[Button disabled with reason; map shows approximate area only]
  D -- Yes --> F[Click Download GPX]
  F --> G[Interstitial on first use: responsible-riding and permission summary, 'I understand']
  G --> H[Server: rate limit, log download count, stream file with attribution + trail URL embedded in metadata]
  H --> I[File saved]
  I --> J[Later prompt: 'Was the trail as described?' → condition report]
```

The downloaded file is a **regenerated, sanitised** GPX (our own writer), not the raw upload: metadata and extensions stripped, name, description, licence, source URL and "verified on" date added.

## 4. Saving a trail

```mermaid
flowchart TD
  A[Tap Save on a trail] --> B{Signed in?}
  B -- Yes --> C[Add to default collection; button becomes Saved; toast with Undo]
  B -- No --> D[Sign-in dialog; intent remembered]
  D --> E[Sign in / up]
  E --> C
  C --> F[Saved page lists trails with status badges]
  G[Trail status or access changes] --> H[Saved item shows 'Changed' badge with what changed]
```

Anonymous saves are not stored locally in MVP (avoids a merge problem); the intent is replayed after sign-in.

## 5. Submitting a trail

```mermaid
flowchart TD
  A[Submit a trail] --> B{Signed in?}
  B -- No --> B1[Sign in] --> C
  B -- Yes --> C[Step 1 Basics: name, summary, state, district, nearest town]
  C --> D[Step 2 Route: upload GPX or draw/mark start and end]
  D --> D1{Server validation}
  D1 -- Errors --> D2[Specific message e.g. 'Only 1 track point found'] --> D
  D1 -- OK --> D3[Preview on map, distance, elevation computed; duplicate check]
  D3 -- Possible duplicate --> D4[Show similar trails: 'Same trail? Suggest an update instead'] --> E
  D3 -- Unique --> E[Step 3 Terrain and difficulty, suitability, season]
  E --> F[Step 4 Access: class, evidence, contact, notes]
  F --> G[Step 5 Photos: upload, order, captions, cover]
  G --> H[Step 6 Safety notes, review summary]
  H --> I[Submit]
  I --> J[Confirmation: what happens next, expected time, link to status]
  C -. autosave .-> Draft[(Draft)]
  D -. autosave .-> Draft
  E -. autosave .-> Draft
  F -. autosave .-> Draft
```

Each step validates only its own fields; a step indicator shows completion; leaving and returning resumes the draft. Photos upload in the background with per-file progress; steps can be completed in any order after Step 1.

## 6. Correcting or reporting information

```mermaid
flowchart TD
  A[Trail page: Report an issue] --> B{Type}
  B -- Closed / gate locked --> C[Quick form: what, since when, photo optional]
  B -- Wrong access --> D[What is correct + evidence]
  B -- Wrong location / GPX --> E[Describe; optional corrected GPX]
  B -- Unsafe / environmental --> F[Details; flagged priority]
  B -- Duplicate / other --> G[Free text, link to other trail]
  C --> H[Submit]
  D --> H
  E --> H
  F --> H
  H --> I[Report ack + reference number]
  I --> J[Moderation queue]
  J --> K{Outcome}
  K -- Accepted --> L[Trail updated; reporter and savers notified]
  K -- Needs info --> M[Ask reporter]
  K -- Rejected --> N[Reporter told why]
```

A single *closure report* does not unpublish a trail by itself; it adds a visible "Reported closed on {date}, awaiting review" notice (condition = *unknown*) so riders are warned immediately. Two independent closure reports within 14 days, or one moderator action, switch the condition to *temporarily closed*. Environmental-concern reports go to the top of the queue and can trigger an immediate moderator "hold" (trail hidden pending review).

## 7. Moderating a submission

```mermaid
flowchart TD
  A[Queue: sorted by age and priority] --> B[Open review panel]
  B --> C[Automated checks shown: GPX valid, duplicate score, EXIF stripped, region auto-detected, protected-area overlap]
  C --> D[Review content, map, photos]
  D --> E[Verify access: evidence, call/message owner or authority if needed; record source and set expiry]
  E --> F{Decision}
  F -- Approve --> G[Publish revision, generate GPX and media variants, update sitemap, notify contributor]
  F -- Request changes --> H[Comments per field; status 'Changes requested'; contributor edits and resubmits] --> A
  F -- Reject --> I[Reason from list + note; contributor notified]
  F -- Publish with limits --> J[Publish without GPX or with reduced geometry, access class shown]
  G --> K[Audit log entry]
  H --> K
  I --> K
  J --> K
```

Two-person rule for risky publications: any trail classified *Restricted*, or overlapping a mapped protected area, requires approval by a second moderator or admin.
