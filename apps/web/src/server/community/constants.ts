/** Limits for questions between riders and for phone sharing. One place, so they are easy to find and change. */
export const REVEAL_WINDOW_SECONDS = 5 * 60; // how long a revealed number stays visible
/** How long an offered phone number waits to be revealed. */
export const OFFER_TTL_HOURS = 24; // how long an offered number waits to be revealed
/** How long a question may wait for an answer before it expires. */
export const QUESTION_TTL_DAYS = 14;
/** The most questions one rider may ask in a day. */
export const QUESTIONS_PER_DAY = 5;
/** The most phone numbers one rider may offer in a day. */
export const PHONE_OFFERS_PER_DAY = 3;

/** Clubs. */
export const CLUB_CREATES_PER_DAY = 2;
/** The most club join requests one rider may send in a day. */
export const JOIN_REQUESTS_PER_DAY = 5;
/** The most club posts and replies one rider may write in an hour. */
export const CLUB_POSTS_PER_HOUR = 20;
export const PHOTOS_PER_DAY = 40; // photos one rider may send to clubs in a day
export const JOIN_PHONE_RETENTION_DAYS = 7; // a join request's phone number is wiped this long after the decision
export const JOIN_REQUEST_TTL_DAYS = 30; // an undecided request is withdrawn, and its phone number wiped, after this long
