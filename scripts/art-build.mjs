import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const projectRoot = process.cwd();
const metadataDir = path.join(projectRoot, 'art', 'metadata');
const originalsDir = path.join(projectRoot, 'art', 'originals');
const generatedArtDir = path.join(projectRoot, 'public', 'art');
const compiledDataPath = path.join(projectRoot, 'src', 'content', 'artworks.json');

const variants = {
  thumb: { width: 560, height: 560, quality: 74 },
  medium: { width: 1280, height: 1280, quality: 80 },
  hero: { width: 2200, height: 2200, quality: 84 },
  full: { width: 3200, height: 3200, quality: 88 }
};

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertNonEmptyString(value, fieldName, fileName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fileName}: field "${fieldName}" must be a non-empty string`);
  }
}

function normalizeSlug(slug, fileName) {
  assertNonEmptyString(slug, 'slug', fileName);
  const normalized = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!normalized) {
    throw new Error(`${fileName}: slug resolves to an empty value`);
  }

  if (normalized !== slug) {
    throw new Error(`${fileName}: slug must already be URL-safe (suggested: "${normalized}")`);
  }

  return normalized;
}

function validateMetadata(raw, fileName) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${fileName}: metadata must be a JSON object`);
  }

  assertNonEmptyString(raw.title, 'title', fileName);
  const slug = normalizeSlug(raw.slug, fileName);
  assertNonEmptyString(raw.medium, 'medium', fileName);
  assertNonEmptyString(raw.dimensions, 'dimensions', fileName);
  assertNonEmptyString(raw.description, 'description', fileName);
  assertNonEmptyString(raw.alt, 'alt', fileName);
  assertNonEmptyString(raw.sourceImage, 'sourceImage', fileName);

  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`${fileName}: field "year" must be a 4-digit integer`);
  }

  if (typeof raw.featured !== 'boolean') {
    throw new Error(`${fileName}: field "featured" must be true or false`);
  }

  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    throw new Error(`${fileName}: field "categories" must contain at least one category`);
  }

  const categories = raw.categories.map((category) => {
    if (typeof category !== 'string' || category.trim().length === 0) {
      throw new Error(`${fileName}: categories must be non-empty strings`);
    }
    return category.trim().toLowerCase();
  });

  const uniqueCategories = Array.from(new Set(categories));

  if (raw.dominantColor !== undefined && typeof raw.dominantColor !== 'string') {
    throw new Error(`${fileName}: optional field "dominantColor" must be a string`);
  }

  return {
    title: raw.title.trim(),
    slug,
    year,
    medium: raw.medium.trim(),
    dimensions: raw.dimensions.trim(),
    description: raw.description.trim(),
    alt: raw.alt.trim(),
    featured: raw.featured,
    categories: uniqueCategories,
    dominantColor: raw.dominantColor ? raw.dominantColor.trim() : undefined,
    sourceImage: raw.sourceImage.trim()
  };
}

async function readMetadataEntries() {
  await mkdir(metadataDir, { recursive: true });
  const entries = await readdir(metadataDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  const parsedEntries = [];
  for (const file of jsonFiles) {
    const filePath = path.join(metadataDir, file.name);
    const rawText = await readFile(filePath, 'utf8');

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(`${file.name}: invalid JSON`);
    }

    parsedEntries.push(validateMetadata(parsed, file.name));
  }

  return parsedEntries;
}

async function ensureSourceImages(metadataEntries) {
  for (const entry of metadataEntries) {
    const sourcePath = path.join(originalsDir, entry.slug, entry.sourceImage);
    if (!(await exists(sourcePath))) {
      throw new Error(
        `${entry.slug}: missing source image at art/originals/${entry.slug}/${entry.sourceImage}`
      );
    }
  }
}

async function buildArtwork(entry) {
  const sourcePath = path.join(originalsDir, entry.slug, entry.sourceImage);
  const outputDir = path.join(generatedArtDir, entry.slug);
  await mkdir(outputDir, { recursive: true });

  const sourceSharp = sharp(sourcePath, { limitInputPixels: false }).rotate();
  const sourceMeta = await sourceSharp.metadata();

  const generatedImages = {};

  for (const [variantName, settings] of Object.entries(variants)) {
    const webpOutput = path.join(outputDir, `${variantName}.webp`);
    const jpgOutput = path.join(outputDir, `${variantName}.jpg`);

    const resizeConfig = {
      width: settings.width,
      height: settings.height,
      fit: 'inside',
      withoutEnlargement: true
    };

    await Promise.all([
      sharp(sourcePath, { limitInputPixels: false })
        .rotate()
        .resize(resizeConfig)
        .webp({ quality: settings.quality })
        .toFile(webpOutput),
      sharp(sourcePath, { limitInputPixels: false })
        .rotate()
        .resize(resizeConfig)
        .jpeg({ quality: Math.max(66, settings.quality - 6), mozjpeg: true })
        .toFile(jpgOutput)
    ]);

    generatedImages[variantName] = {
      webp: `/art/${entry.slug}/${variantName}.webp`,
      jpg: `/art/${entry.slug}/${variantName}.jpg`
    };
  }

  return {
    id: entry.slug,
    title: entry.title,
    slug: entry.slug,
    year: entry.year,
    medium: entry.medium,
    dimensions: entry.dimensions,
    description: entry.description,
    alt: entry.alt,
    featured: entry.featured,
    categories: entry.categories,
    dominantColor: entry.dominantColor,
    width: sourceMeta.width ?? null,
    height: sourceMeta.height ?? null,
    images: generatedImages
  };
}

async function main() {
  await mkdir(path.join(projectRoot, 'src', 'content'), { recursive: true });
  await mkdir(originalsDir, { recursive: true });

  const metadataEntries = await readMetadataEntries();

  const slugSet = new Set();
  for (const entry of metadataEntries) {
    if (slugSet.has(entry.slug)) {
      throw new Error(`Duplicate slug detected: "${entry.slug}"`);
    }
    slugSet.add(entry.slug);
  }

  await ensureSourceImages(metadataEntries);

  await rm(generatedArtDir, { recursive: true, force: true });
  await mkdir(generatedArtDir, { recursive: true });

  const compiled = [];

  for (const entry of metadataEntries) {
    const built = await buildArtwork(entry);
    compiled.push(built);
  }

  compiled.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));

  await writeFile(compiledDataPath, `${JSON.stringify(compiled, null, 2)}\n`, 'utf8');

  process.stdout.write(`art:build completed for ${compiled.length} artwork item(s).\n`);
}

main().catch((error) => {
  process.stderr.write(`art:build failed: ${error.message}\n`);
  process.exit(1);
});

