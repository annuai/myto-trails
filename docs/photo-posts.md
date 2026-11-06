# Photo posts, reactions and albums

How club photos work, and why. Decisions are in the table at the end.

## Flow

1. **The phone makes three JPEG copies** of each photo (400, 1080 and 2048 pixels on the long edge, quality about 82) with the location and camera details dropped by the re-encode.
2. `POST /api/v1/clubs/{id}/photo-uploads` with the byte size of each copy. The answer is one signed `PUT` address per copy, in the **quarantine** bucket, under `post/<owner>/<asset>-<size>.jpg`. Nothing is public yet.
3. The phone `PUT`s the copies straight to R2. The site's servers never carry the bytes, so Vercel Hobby's request limits do not matter.
4. `POST /api/v1/clubs/{id}/photo-posts` with the asset ids in order, optional text, and optional `eventId` (a ride event of this club). The server reads each copy back and checks its size, type and JPEG header, **removes any embedded location again if one is present**, takes the picture's main colour from the thumbnail, copies the three files to the **public** bucket, and writes the post in one transaction (`club_post`, `asset`, `post_media`). The quarantine copies are then removed.
5. `GET /api/v1/clubs/{id}/posts?limit=&before=` returns the feed, 50 at a time by default, newest first, with each post's photos (three addresses and the main colour), reaction counts, the caller's own reaction and its event. `nextCursor` goes back in as `before`.
6. `PUT /api/v1/club-posts/{postId}/reaction` sets one of `like love fire laugh wow thanks` (one per person, a new one replaces it) or `null` to take it back. The post's `reaction_counts` is rewritten in the same transaction, so a feed read never counts rows.
7. `GET /api/v1/clubs/{id}/events/{eventId}/photos` is the album of a ride event.
8. Removing a post (`DELETE /club-posts/{postId}`) removes its files and rows at once. Deleting an account removes the rider's files. The nightly purge (`orphanPhotos`) removes any photo with no post a day on.

## Cost and limits

About 1.4 MB per photo for the three copies. R2 gives 10 GB free, then $0.015 per GB a month, and **no egress fees**. At most 10 photos a post, 40 photos per rider per day, 20 posts per hour.

Set a lifecycle rule on the R2 **quarantine** bucket to delete objects after one day: copies sent but never posted leave nothing in the database to find.

## Decisions

| Question | Decision |
|---|---|
| Who sees a photo | Members of the club, in the app. The public files have unguessable names; a removed post's files are deleted. |
| Who can download | Any member, from the 2048-pixel copy. |
| Reactions | One per person per post, six fixed ones. `reaction.target_kind` leaves room for comments and rides later. |
| Video | Not yet. |
| Live chat | Not built. Pull on open and while a screen is up, push later (needs an Apple key in Expo). |
