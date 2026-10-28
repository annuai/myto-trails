// Shapes the website's /api/v1 sends and the phone app reads. The server builds them and the app types its responses with
// them, so the two cannot drift apart. Only the community and profile shapes live here so far; trail shapes follow.

export type Bike = { name: string; modelYear: number | null; photoUrl: string | null };

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
