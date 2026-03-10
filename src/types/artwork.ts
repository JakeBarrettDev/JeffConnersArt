export type ArtworkCategory =
  | 'abstract'
  | 'landscape'
  | 'portrait'
  | 'mixed-media'
  | 'experimental'
  | 'other';

export interface ArtworkImageVariant {
  webp: string;
  jpg: string;
}

export interface ArtworkImages {
  thumb: ArtworkImageVariant;
  medium: ArtworkImageVariant;
  hero: ArtworkImageVariant;
  full: ArtworkImageVariant;
}

export interface Artwork {
  id: string;
  title: string;
  slug: string;
  year: number;
  medium: string;
  dimensions: string;
  alt: string;
  featured: boolean;
  description: string;
  categories: ArtworkCategory[];
  dominantColor?: string;
  images: ArtworkImages;
}

