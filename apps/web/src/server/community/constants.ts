/** Limits for questions between riders and for phone sharing. One place, so they are easy to find and change. */
export const REVEAL_WINDOW_SECONDS = 5 * 60; // how long a revealed number stays visible
export const OFFER_TTL_HOURS = 24; // how long an offered number waits to be revealed
export const QUESTION_TTL_DAYS = 14;
export const QUESTIONS_PER_DAY = 5;
export const PHONE_OFFERS_PER_DAY = 3;

/** Clubs. */
export const CLUB_CREATES_PER_DAY = 2;
export const JOIN_REQUESTS_PER_DAY = 5;
export const CLUB_POSTS_PER_HOUR = 20;
export const JOIN_PHONE_RETENTION_DAYS = 7; // a join request's phone number is wiped this long after the decision
export const JOIN_REQUEST_TTL_DAYS = 30; // an undecided request is withdrawn, and its phone number wiped, after this long
