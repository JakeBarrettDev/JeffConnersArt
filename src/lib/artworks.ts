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


export function getArtworkNeighbors(slug: string): { previous: Artwork; next: Artwork } | null {
  const ordered = getAllArtworks();
  const index = ordered.findIndex((artwork) => artwork.slug === slug);
  if (index < 0 || ordered.length < 2) {
    return null;
  }

  return {
    previous: ordered[(index - 1 + ordered.length) % ordered.length],
    next: ordered[(index + 1) % ordered.length]
  };
}
