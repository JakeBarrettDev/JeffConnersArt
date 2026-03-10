import artworkData from '../content/artworks.json';
import type { Artwork } from '../types/artwork';

const artworks = (artworkData as Artwork[]).map((artwork) => ({ ...artwork }));

export function getAllArtworks(): Artwork[] {
  return artworks
    .slice()
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
}

export function getFeaturedArtworks(limit = 6): Artwork[] {
  return getAllArtworks()
    .filter((artwork) => artwork.featured)
    .slice(0, limit);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(artworks.flatMap((artwork) => artwork.categories))).sort();
}

