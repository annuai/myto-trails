// Shapes the website's /api/v1 sends and the phone app reads. The server builds them and the app types its responses with
// them, so the two cannot drift apart. Only the community and profile shapes live here so far; trail shapes follow.
import type { CarryItem } from "./trailCarry";


/**
 * A rider's bike. `photoUrl` is the one image to show: the rider's own photo, else the catalogue image of the model they
 * picked, else null. `ownPhoto` says which of the first two it is.
 */
export type Bike = { name: string; modelYear: number | null; photoUrl: string | null; ownPhoto: boolean; bikeModelId: string | null };

/** WebP widths of a catalogue image, keyed by width: { "400": url, "800": url, "1200": url }. */
export type BikeImageVariants = Record<string, string>;
export type BikeModel = {
  id: string;
  slug: string;
  make: string;
  makeSlug: string;
  model: string;
  variant: string | null;
  category: string;
  engineCc: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  /** null when the model has no picture yet (only listed with ?all=1). */
  image: BikeImageVariants | null;
};
export type BikeModelPage = { items: BikeModel[]; page: number; pageSize: number; total: number };
export type BikeMake = { slug: string; name: string; models: number };
export type BikeMakeList = { items: BikeMake[] };

/** A club as one rider sees it: their role is null when they are not a member. */
export type ClubSummary = {
  clubId: string;
  name: string;
  description: string;
  womenOnly: boolean;
  memberCount: number;
  role: "admin" | "member" | null;
  requested: boolean;
  coverUrl: string | null;
};
export type ClubView = ClubSummary & { myHandle: string };

/** Only ever sent to members of the same club. */
export type ClubMember = { handle: string; name: string; role: "admin" | "member"; avatarUrl: string | null; bike: Bike | null };
export type ClubDetail = { club: ClubView; members: ClubMember[] | null };

/**
 * The private fields of your own profile. `gender` and `phone` are never sent to any other rider. `phone` is the rider's
 * optional number in international form ("+919812345678"), not verified. `welcomeDone` is true once the 18+ and driving
 * licence declaration has been made (until then community writes answer 403 not_member).
 */
export type MyProfile = { displayName: string; public: boolean; bio: string | null; gender: "male" | "female" | "other" | null; phone: string | null; welcomeDone: boolean };
export type MeProfile = { displayName: string; email: string; scopes: string[]; avatarUrl: string | null; bike: Bike | null; profile: MyProfile };

/** A reply under a club post. */
export type ClubReply = { id: string; authorName: string; body: string; createdAt: string; mine: boolean };
/** A club post or ride plan. `at` and `place` are set on ride plans only. */
export type ClubPost = {
  id: string; kind: "post" | "ride_plan"; authorName: string; authorHandle: string; body: string; createdAt: string; mine: boolean;
  at: string | null; place: string | null; going: number; maybe: number; myResponse: "going" | "maybe" | null; replies: ClubReply[];
};
/** Admins only. `phone` is null once its retention time has passed. */
export type ClubJoinRequest = { id: string; name: string; phone: string | null; message: string | null; status: "pending" | "accepted" | "declined" | "withdrawn"; createdAt: string };

export type EventRole = "captain" | "marshal" | "medic" | "sweep";
export type EventResponse = "going" | "maybe" | "declined" | "waitlisted";
export type DeclineReason = "work" | "bike" | "distance" | "other";
export type EventStatus = "scheduled" | "live" | "ended" | "cancelled";
/** A ride event in a list. `mine` is true for the host. */
export type RideEvent = {
  id: string; title: string; startsAt: string; timeZone: string; placeName: string; audience: "open" | "members"; status: EventStatus;
  clubId: string | null; clubName: string | null; hostName: string; /** The event's own cover, or its club's, or null. */ coverUrl: string | null; going: number; capacity: number | null; myResponse: EventResponse | null; mine: boolean;
};
/** One reply on the roster. The host alone receives the roster, with reasons and notes. */
export type RosterRow = { id: string; name: string; response: EventResponse; reason: DeclineReason | null; note: string | null; checkedIn: boolean; role: EventRole | null };
export type RideEventDetail = RideEvent & {
  description: string; lat: number; lng: number; radiusM: number; maybe: number; waitlisted: number; checkedInCount: number;
  checkedIn: boolean; myRole: EventRole | null; rideLive: boolean; roster: RosterRow[] | null;
};
export type EventInput = {
  title: string; description?: string; startsAt: string; timeZone?: string; placeName: string; lat: number; lng: number; radiusM?: number;
  audience: "open" | "members"; capacity?: number | null; clubId?: string | null; /** A completed image upload by the host. */ coverMediaId?: string | null;
};

export type CommentTag = "gate_closed" | "water_high" | "blocked" | "good_condition" | "tip";
/** A trail comment. `pending` comments are the viewer's own, waiting for a moderator. */
export type TrailComment = {
  id: string; body: string; tag: CommentTag | null; createdAt: string; editedAt: string | null; authorName: string; authorId: string | null;
  mine: boolean; pending: boolean; replies: TrailComment[];
};

/** What to carry and when to arrive, from the trail's published revision. null when every part is empty: existing trails show nothing. */
export type TrailCarry = {
  waterLitres: number | null;
  items: CarryItem[];
  notes: string | null;
  /** Best time of day to reach the trail, in minutes after midnight (local time). */
  arrival: { from: number; to: number } | null;
  arrivalNote: string | null;
};

/**
 * Riders who marked the trail safe for women riders (distinct, last 24 months). Nobody can see who marked.
 * `mine` and `canMark` describe the viewer and are false for anyone not signed in.
 */
export type WomenSafe = { count: number; confirmed: boolean; mine: boolean; canMark: boolean };
