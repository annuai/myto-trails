export const ACCESS_CLASSES = ["public", "permission_required", "private_no_access", "restricted", "unknown"] as const;
export const OPERATIONAL_STATUSES = ["open", "temporarily_closed", "permanently_closed", "seasonal", "unknown"] as const;
export const VERIFICATION_LEVELS = ["officially_verified", "moderator_verified", "community_reported", "unverified"] as const;

export type AccessClass = (typeof ACCESS_CLASSES)[number];
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
