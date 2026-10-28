// Shapes the website's /api/v1 sends and the phone app reads. The server builds them and the app types its responses with
// them, so the two cannot drift apart. Only the community and profile shapes live here so far; trail shapes follow.

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

export type MeProfile = { displayName: string; email: string; scopes: string[]; avatarUrl: string | null; bike: Bike | null };
