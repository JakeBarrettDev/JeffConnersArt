export const contactEmail = 'jeffconnersart@gmail.com';
export const facebookUrl = 'https://www.facebook.com/profile.php?id=61574884405561';

export function inquiryHref(subject: string): string {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}
