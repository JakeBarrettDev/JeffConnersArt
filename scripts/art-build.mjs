import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import heicConvert from 'heic-convert';
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

function warn(message) {
  process.stderr.write(`art:build warning: ${message}\n`);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function optionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Entries may be written by hand or by Pages CMS (see .pages.yml), so everything
// except the title and photo has a sensible fallback instead of failing the deploy.
function validateMetadata(raw, fileName) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('metadata must be a JSON object');
  }

  const title = optionalString(raw.title);
  if (!title) {
    throw new Error('field "title" is required');
  }

  const sourceImage = optionalString(raw.sourceImage);
  if (!sourceImage) {
    throw new Error('field "sourceImage" (the photo) is required');
  }

  const slug = slugify(optionalString(raw.slug) || path.basename(fileName, '.json') || title);
  if (!slug) {
    throw new Error('could not derive a URL slug from the file name or title');
  }

  let year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    year = new Date().getFullYear();
    warn(`${fileName}: "year" missing or invalid, using ${year}`);
  }

  const rawCategories = Array.isArray(raw.categories)
    ? raw.categories
    : typeof raw.categories === 'string'
      ? [raw.categories]
      : [];
  const categories = Array.from(
    new Set(rawCategories.map((category) => optionalString(category).toLowerCase()).filter(Boolean))
  );
  if (categories.length === 0) {
    categories.push('other');
  }

  const medium = optionalString(raw.medium);
  const dominantColor = optionalString(raw.dominantColor);

  return {
    title,
    slug,
    year,
    medium,
    dimensions: optionalString(raw.dimensions),
    description: optionalString(raw.description),
    alt: optionalString(raw.alt) || `${title}${medium ? `, ${medium.toLowerCase()}` : ''} by Jeff Conners`,
    featured: raw.featured === true,
    categories,
    dominantColor: /^#[0-9a-f]{6}$/i.test(dominantColor) ? dominantColor : undefined,
    sourceImage
  };
}

// Legacy entries store a bare file name under art/originals/<slug>/; Pages CMS
// stores a repo-relative path such as art/originals/blue-rain.jpg.
function resolveSourcePath(entry) {
  const normalized = entry.sourceImage.replace(/^\/+/, '');
  if (normalized.includes('/')) {
    return path.join(projectRoot, normalized);
  }
  return path.join(originalsDir, entry.slug, normalized);
}

async function readMetadataEntries() {
  await mkdir(metadataDir, { recursive: true });
  const entries = await readdir(metadataDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  const parsedEntries = [];
  for (const file of jsonFiles) {
    const filePath = path.join(metadataDir, file.name);

    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      const entry = validateMetadata(parsed, file.name);
      if (!(await exists(resolveSourcePath(entry)))) {
        throw new Error(`photo not found at ${path.relative(projectRoot, resolveSourcePath(entry))}`);
      }
      parsedEntries.push(entry);
    } catch (error) {
      warn(`skipping ${file.name}: ${error instanceof SyntaxError ? 'invalid JSON' : error.message}`);
    }
  }

  return parsedEntries;
}

// sharp's prebuilt binaries cannot decode HEIC, so iPhone photos are converted first.
async function loadSourceInput(sourcePath) {
  if (!/\.(heic|heif)$/i.test(sourcePath)) {
    return sourcePath;
  }

  const converted = await heicConvert({
    buffer: await readFile(sourcePath),
    format: 'JPEG',
    quality: 0.95
  });
  return Buffer.from(converted);
}

// Average color, saturated a little so it reads as a tint rather than mud.
async function averageColor(input) {
  const pixel = await sharp(input, { limitInputPixels: false })
    .resize(1, 1, { fit: 'fill' })
    .modulate({ saturation: 1.5 })
    .removeAlpha()
    .raw()
    .toBuffer();
  return `#${Array.from(pixel.subarray(0, 3), (channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

async function buildArtwork(entry) {
  const input = await loadSourceInput(resolveSourcePath(entry));
  const outputDir = path.join(generatedArtDir, entry.slug);
  await mkdir(outputDir, { recursive: true });

  const generatedImages = {};
  let fullSize = { width: null, height: null };

  for (const [variantName, settings] of Object.entries(variants)) {
    const webpOutput = path.join(outputDir, `${variantName}.webp`);
    const jpgOutput = path.join(outputDir, `${variantName}.jpg`);

    const resizeConfig = {
      width: settings.width,
      height: settings.height,
      fit: 'inside',
      withoutEnlargement: true
    };

    const [webpInfo] = await Promise.all([
      sharp(input, { limitInputPixels: false })
        .rotate()
        .resize(resizeConfig)
        .webp({ quality: settings.quality })
        .toFile(webpOutput),
      sharp(input, { limitInputPixels: false })
        .rotate()
        .resize(resizeConfig)
        .jpeg({ quality: Math.max(66, settings.quality - 6), mozjpeg: true })
        .toFile(jpgOutput)
    ]);

    if (variantName === 'full') {
      fullSize = { width: webpInfo.width, height: webpInfo.height };
    }

    generatedImages[variantName] = {
      webp: `/art/${entry.slug}/${variantName}.webp`,
      jpg: `/art/${entry.slug}/${variantName}.jpg`
    };
  }

  const dominantColor = entry.dominantColor ?? (await averageColor(input));

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
    dominantColor,
    width: fullSize.width,
    height: fullSize.height,
    images: generatedImages
  };
}

async function main() {
  await mkdir(path.join(projectRoot, 'src', 'content'), { recursive: true });
  await mkdir(originalsDir, { recursive: true });

  const metadataEntries = await readMetadataEntries();

  const slugSet = new Set();
  const uniqueEntries = metadataEntries.filter((entry) => {
    if (slugSet.has(entry.slug)) {
      warn(`skipping duplicate slug "${entry.slug}"`);
      return false;
    }
    slugSet.add(entry.slug);
    return true;
  });

  await rm(generatedArtDir, { recursive: true, force: true });
  await mkdir(generatedArtDir, { recursive: true });

  const compiled = [];

  for (const entry of uniqueEntries) {
    try {
      compiled.push(await buildArtwork(entry));
    } catch (error) {
      warn(`skipping ${entry.slug}: could not process photo (${error.message})`);
    }
  }

  compiled.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));

  await writeFile(compiledDataPath, `${JSON.stringify(compiled, null, 2)}\n`, 'utf8');

  process.stdout.write(`art:build completed for ${compiled.length} artwork item(s).\n`);
}

main().catch((error) => {
  process.stderr.write(`art:build failed: ${error.message}\n`);
  process.exit(1);
});

