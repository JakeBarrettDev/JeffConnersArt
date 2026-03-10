import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const metadataDir = path.join(projectRoot, 'art', 'metadata');
const originalsDir = path.join(projectRoot, 'art', 'originals');

function parseArg(args, key) {
  const flagIndex = args.indexOf(`--${key}`);
  if (flagIndex < 0) {
    return undefined;
  }
  return args[flagIndex + 1];
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const titleArg = parseArg(args, 'title');
  const slugArg = parseArg(args, 'slug');

  if (!titleArg) {
    throw new Error('Missing required argument --title "Artwork Title"');
  }

  const slug = slugArg ? slugify(slugArg) : slugify(titleArg);

  if (!slug) {
    throw new Error('Could not generate a valid slug. Use --slug with letters/numbers.');
  }

  await mkdir(metadataDir, { recursive: true });
  await mkdir(originalsDir, { recursive: true });

  const metadataPath = path.join(metadataDir, `${slug}.json`);
  const artworkOriginalsDir = path.join(originalsDir, slug);
  const instructionsPath = path.join(artworkOriginalsDir, 'README.txt');

  if (await exists(metadataPath)) {
    throw new Error(`Metadata already exists: art/metadata/${slug}.json`);
  }

  const template = {
    title: titleArg,
    slug,
    year: new Date().getFullYear(),
    medium: 'Acrylic on canvas',
    dimensions: '24 x 36 in',
    description: 'Describe this piece in one short paragraph.',
    alt: 'Accessible description of the artwork.',
    featured: false,
    categories: ['abstract'],
    dominantColor: '#38d6ff',
    sourceImage: 'main.jpg'
  };

  await mkdir(artworkOriginalsDir, { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await writeFile(
    instructionsPath,
    [
      `Drop the source image in this folder as ${template.sourceImage}.`,
      'Then run: npm run art:build',
      '',
      'Supported source formats: .jpg, .jpeg, .png, .webp, .tif, .tiff, .gif, .svg'
    ].join('\n'),
    'utf8'
  );

  process.stdout.write(`Created art/metadata/${slug}.json\n`);
  process.stdout.write(`Created art/originals/${slug}/README.txt\n`);
  process.stdout.write('Next steps:\n');
  process.stdout.write(`1) Add your source image to art/originals/${slug}/${template.sourceImage}\n`);
  process.stdout.write('2) Run npm run art:build\n');
}

main().catch((error) => {
  process.stderr.write(`art:new failed: ${error.message}\n`);
  process.exit(1);
});

