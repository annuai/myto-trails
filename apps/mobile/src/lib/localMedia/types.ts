export type DocKind = 'licence' | 'rc' | 'insurance' | 'puc';
export type DocSide = 'front' | 'back';

/** What the profile store keeps about a document photo. The file itself lives on the phone, named by `id`. */
export type DocPhoto = { id: string; docKind: DocKind; side?: DocSide; width: number; height: number; addedAt: number };
