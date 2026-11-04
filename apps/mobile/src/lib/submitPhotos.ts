export type SubmissionPhoto = { mediaId: string; altText: string };
/** The most photos a submission takes; the server refuses more. */
export const MAX_SUBMISSION_PHOTOS = 8;

/** Body of step 5 (photos). Blank descriptions are trimmed to nothing so the server's rule is met before sending. */
export const photoStep = (photos: SubmissionPhoto[] = []) => photos.map((p) => ({ mediaId: p.mediaId, altText: p.altText.trim().slice(0, 300) }));
