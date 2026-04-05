/**
 * One-time import script: converts Jeff's source images (HEIC/PNG)
 * to JPEG originals and creates metadata entries for each piece.
 *
 * Usage: node scripts/import-artworks.mjs
 */

import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const projectRoot = process.cwd();
const sourceDir = 'C:/Users/cjhoo/Desktop/Images/jeffConnersArtworks';
const metadataDir = path.join(projectRoot, 'art', 'metadata');
const originalsDir = path.join(projectRoot, 'art', 'originals');

// Working titles and metadata for each piece, mapped by filename.
// These are placeholder titles — Jeff can rename later.
const catalog = [
  { file: 'IMG_0011', title: 'Heat Signal', categories: ['urban'], medium: 'Mixed media on paper', desc: 'An intersection dissolves into red and orange heat, traffic lights and cars reduced to dark silhouettes against a burning sky.', alt: 'Abstract urban intersection bathed in intense red and orange tones with silhouetted traffic light and car', featured: true, color: '#e03010' },
  { file: 'IMG_0107', title: 'Streetlamp Figure', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'A solitary figure stands beneath a streetlamp in deep blues and blacks, the light above breaking into pale yellow against an urban skyline.', alt: 'Silhouetted figure standing under a glowing streetlamp in a dark blue and black urban night scene', featured: true, color: '#1a3a8c' },
  { file: 'IMG_0250', title: 'Three Walking', categories: ['portrait'], medium: 'Watercolor on paper', desc: 'Three figures seen from behind, walking together in loose watercolor — the shapes of connection drawn without detail.', alt: 'Watercolor painting of three people walking away from viewer in muted earth tones', featured: false, color: '#a89070' },
  { file: 'IMG_0255', title: 'Two in Yellow', categories: ['portrait'], medium: 'Watercolor and ink', desc: 'Two figures in bright jackets — one yellow, one blue — walk side by side, rendered in quick gestural ink and wash.', alt: 'Gestural watercolor sketch of two people in yellow and blue jackets', featured: false, color: '#c8a030' },
  { file: 'IMG_0264', title: 'Autumn Trail', categories: ['landscape'], medium: 'Watercolor on paper', desc: 'A path curves into a wall of autumn foliage — copper, rust, and hints of cyan between the trees.', alt: 'Watercolor landscape of a trail leading into autumn trees in warm rust and copper tones', featured: false, color: '#a85830' },
  { file: 'IMG_0386', title: 'City Rain Crossing', categories: ['urban'], medium: 'Watercolor on paper', desc: 'Silhouettes with umbrellas move through a rain-soaked intersection, buildings rising in warm amber and teal around them.', alt: 'Watercolor of silhouetted figures with umbrellas crossing a rainy city street with teal and amber buildings', featured: false, color: '#c08030' },
  { file: 'IMG_0394', title: 'Equestrian Skyline', categories: ['urban', 'landscape'], medium: 'Watercolor on paper', desc: 'A statue on horseback presides over a hazy skyline under a wash of peach and coral sky.', alt: 'Watercolor of equestrian statue silhouette against a peach and coral urban skyline at sunset', featured: false, color: '#d8906a' },
  { file: 'IMG_0505', title: 'Blossom Path', categories: ['landscape'], medium: 'Acrylic on canvas', desc: 'A black-and-white forest path punctuated by bursts of pink blossoms — a study in where the eye goes when color is scarce.', alt: 'Monochromatic acrylic painting of a forest path with pink blossom accents on dark trees', featured: true, color: '#808080' },
  { file: 'IMG_0524', title: 'Rainy Guggenheim', categories: ['urban'], medium: 'Watercolor and ink', desc: 'The Guggenheim emerges from rain and atmosphere, a blue umbrella the only saturated note in a field of grey wash.', alt: 'Watercolor of the Guggenheim museum in rain with blue umbrella figure and grey atmospheric wash', featured: false, color: '#4050a0' },
  { file: 'IMG_0973', title: 'Traffic Silhouettes', categories: ['urban'], medium: 'Watercolor on paper', desc: 'Cars and buildings rendered as dark ink shapes against glowing light — the city reduced to what the eye remembers at speed.', alt: 'Atmospheric watercolor of dark car and building silhouettes against a glowing backlit city street', featured: false, color: '#b87840' },
  { file: 'IMG_1008', title: 'City Overlook', categories: ['urban'], medium: 'Oil on canvas', desc: 'A rainy cityscape viewed from above — wet streets reflect signs and traffic as the skyline dissolves into mist and pink haze.', alt: 'Oil painting of a rainy city intersection viewed from above with reflective wet streets and misty skyline', featured: true, color: '#906888' },
  { file: 'IMG_1178', title: 'Lone Tree', categories: ['landscape'], medium: 'Watercolor on paper', desc: 'A bare tree stands in autumn marsh, branches reaching into a grey sky as rust-colored grasses and a pale stream flow beneath.', alt: 'Watercolor of a solitary bare tree in autumn marshland with rust grasses and pale stream', featured: false, color: '#885040' },
  { file: 'IMG_1180', title: 'Blue Crowd', categories: ['portrait'], medium: 'Watercolor on paper', desc: 'A procession of figures rendered entirely in shades of blue — individual forms dissolving into the collective.', alt: 'Minimalist watercolor of a crowd of people silhouettes in various shades of blue on white', featured: true, color: '#1848a0' },
  { file: 'IMG_1222', title: 'Night Walk', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Two figures walk together on a neon-lit night street, pools of green and orange light reflected in wet pavement around them.', alt: 'Acrylic painting of two silhouetted figures walking on a neon-lit wet city street at night', featured: true, color: '#306030' },
  { file: 'IMG_1369', title: 'In Profile', categories: ['portrait'], medium: 'Acrylic on canvas', desc: 'A woman in profile, hair swept back in bold gestural strokes of black and orange — paint applied with the same force as wind.', alt: 'Expressive acrylic portrait of a woman in profile with windswept hair in bold orange and black strokes', featured: true, color: '#c88030' },
  { file: 'IMG_1469', title: 'Manhattanhenge', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'A figure with an umbrella crosses a rain-soaked canyon of buildings as golden light floods between the towers.', alt: 'Acrylic painting of a lone umbrella figure crossing a city street with dramatic golden light between tall buildings', featured: true, color: '#d0903a' },
  { file: 'IMG_1502', title: 'Blue Rain', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Orange and yellow umbrellas pop against a blue-drenched city intersection — figures, taxis, and rain all moving at once.', alt: 'Acrylic painting of a rainy blue city street with bright orange umbrellas and yellow taxis', featured: true, color: '#3868b8' },
  { file: 'IMG_1541', title: 'Wet Night Crossing', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Umbrella-carrying silhouettes cross in front of a yellow taxi as rain turns the city into streaks of orange, blue, and black.', alt: 'Dramatic acrylic night scene of silhouettes with umbrellas near a taxi on rain-streaked dark city streets', featured: false, color: '#c07020' },
  { file: 'IMG_1545', title: 'Violet Hour', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Figures move through a city intersection lit in violet, orange, and blue — the city vibrating in color that only exists in the gap between day and night.', alt: 'Vibrant acrylic painting of city figures in a purple and orange lit urban night scene with neon reflections', featured: true, color: '#6030a0' },
  { file: 'IMG_1592', title: 'Wildflower Hillside', categories: ['landscape'], medium: 'Acrylic on canvas', desc: 'Red poppies and golden wildflowers lead the eye toward a hazy blue ridge — the landscape alive with layered texture.', alt: 'Acrylic landscape of red poppies and wildflowers on a hillside with blue mountains in the background', featured: true, color: '#c08820' },
  { file: 'IMG_1649', title: 'Sepia Crossing', categories: ['urban'], medium: 'Watercolor and ink', desc: 'A figure walks beneath traffic lights and power lines in warm sepia wash — the city stripped to its bones in brown ink.', alt: 'Sepia-toned watercolor of a lone figure walking under traffic lights and power lines on a city street', featured: false, color: '#a08050' },
  { file: 'IMG_1678', title: 'Emerald Rain', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'A lone umbrella figure walks between parked cars in a downpour of electric green light — the city recast in a color it never asked for.', alt: 'Acrylic painting of a figure with umbrella in an intensely green-lit rainy city street at night', featured: true, color: '#20c040' },
  { file: 'IMG_1701', title: 'The Restaurant', categories: ['urban', 'portrait'], medium: 'Acrylic on canvas', desc: 'A waiter carries a bottle through a warm amber dining room — the architecture receding into arches and golden light.', alt: 'Acrylic interior scene of a waiter in a warmly lit restaurant with arched columns and seated diners', featured: false, color: '#c07030' },
  { file: 'IMG_1705', title: 'Venice Canal', categories: ['landscape'], medium: 'Oil on canvas', desc: 'Gondolas rest in golden water as Venice dissolves into haze and light, domes and colonnades glowing at the vanishing point.', alt: 'Oil painting of a Venice canal in golden haze with domed buildings and a lone gondola', featured: true, color: '#c0a860' },
  { file: 'IMG_1711', title: 'Golden Silhouettes', categories: ['portrait'], medium: 'Acrylic on canvas', desc: 'Two figures lean together against a golden sky — their forms pure silhouette, their closeness the only detail that matters.', alt: 'Acrylic painting of two silhouetted figures leaning together against a warm golden and dark background', featured: true, color: '#c0a020' },
  { file: 'IMG_1713', title: 'Red Canyon', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Towers of blue and black rise against a blazing red sky — the city as geological formation, carved in paint.', alt: 'Bold acrylic of dark blue city buildings against an intense red sky with yellow window lights', featured: true, color: '#d82010' },
  { file: 'IMG_1736', title: 'Sunflower Field', categories: ['landscape'], medium: 'Acrylic on canvas', desc: 'Massive sunflowers press toward a cobalt sky — the blooms so close they fill the frame, all heat and texture.', alt: 'Vivid acrylic painting of large yellow and orange sunflowers against a bright blue sky', featured: true, color: '#e0a020' },
  { file: 'IMG_1746', title: 'Autumn Falls', categories: ['landscape'], medium: 'Acrylic on canvas', desc: 'A waterfall pours through autumn forest in electric blue, orange, and red — every surface thick with impasto texture.', alt: 'Colorful acrylic landscape of a waterfall surrounded by vivid blue and orange autumn trees', featured: true, color: '#2870c0' },
  { file: 'IMG_1763', title: 'Neon District', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Figures and vendors in a saturated blur of blue, magenta, and red — the city at its loudest, painted at its most electric.', alt: 'Intensely saturated acrylic painting of a neon-lit urban street scene with vibrant blues, reds, and magentas', featured: true, color: '#c01848' },
  { file: 'IMG_1795', title: 'Uptown Lights', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Taxis streak through Times Square under neon signs — the Uptown Cafe glowing as the city pulses in blue and red.', alt: 'Vibrant acrylic night scene of Times Square with neon signs, yellow taxis, and blue-red city lights', featured: true, color: '#2020c0' },
  { file: 'IMG_1803', title: 'Snowfall Traffic', categories: ['urban'], medium: 'Watercolor and ink', desc: 'Snow dots fall through a cityscape of teal and purple — cars and buildings rendered in loose, atmospheric ink wash.', alt: 'Atmospheric watercolor of city traffic in falling snow with teal and purple tones', featured: false, color: '#604868' },
  { file: 'IMG_1815', title: 'Rainy Afternoon', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Yellow cabs and colored umbrellas move through a blue rain — a busy intersection rendered with joyful urgency.', alt: 'Acrylic painting of a rainy city afternoon with yellow taxis, colorful umbrellas, and neon storefronts', featured: true, color: '#d89020' },
  { file: 'IMG_1831', title: 'Red Skyline', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'Blue towers against a red sky — the city simplified to its boldest possible contrast, all structure and fire.', alt: 'Bold acrylic painting of blue skyscrapers against a vivid red sky', featured: false, color: '#1838b0' },
  { file: 'IMG_1855', title: 'City Grid', categories: ['urban'], medium: 'Watercolor and ink', desc: 'An aerial view of the city in rain and mist, the grid of streets catching light where water pools between buildings.', alt: 'Atmospheric watercolor aerial view of a misty city grid with rain and reflected light', featured: false, color: '#606870' },
  { file: 'IMG_9848', title: 'Meadow Light', categories: ['landscape'], medium: 'Pastel on paper', desc: 'Red wildflowers and golden grasses glow beneath mountain haze — a quiet moment between the urban storms.', alt: 'Pastel landscape of red wildflowers and golden grass with hazy blue mountains and an orange tree', featured: false, color: '#c0a020' },
  { file: 'IMG_9912', title: 'The Blue Umbrella', categories: ['urban'], medium: 'Watercolor and ink', desc: 'A blue umbrella and a blue car emerge from grey rain — everything else surrendered to atmosphere.', alt: 'Watercolor of a person with blue umbrella and blue car in a grey rainy cityscape', featured: false, color: '#2040c0' },
  { file: 'IMG_9974', title: 'Night Bridge', categories: ['urban'], medium: 'Acrylic on canvas', desc: 'The Brooklyn Bridge at night, its cables and towers glowing in blue against the warm amber lights of the city beyond.', alt: 'Acrylic painting of a bridge at night with blue structural elements and warm amber city lights in background', featured: false, color: '#1830a0' },
];

async function main() {
  await mkdir(metadataDir, { recursive: true });
  await mkdir(originalsDir, { recursive: true });

  // Step 1: Convert HEIC files to JPEG using heic-convert, copy PNGs via sharp
  const heicConvert = require('heic-convert');
  const sharp = require('sharp');

  let converted = 0;
  let skipped = 0;

  for (const entry of catalog) {
    const slug = entry.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const artDir = path.join(originalsDir, slug);
    await mkdir(artDir, { recursive: true });

    const outPath = path.join(artDir, 'main.jpg');

    // Find the source file
    const srcHeic = path.join(sourceDir, `${entry.file}.HEIC`);
    const srcPng = path.join(sourceDir, `${entry.file}.PNG`);

    let sourceBuffer;
    let isHeic = false;
    let isPng = false;

    try {
      sourceBuffer = await readFile(srcHeic);
      isHeic = true;
    } catch {
      try {
        sourceBuffer = await readFile(srcPng);
        isPng = true;
      } catch {
        console.log(`SKIP: ${entry.file} — source file not found`);
        skipped++;
        continue;
      }
    }

    try {
      if (isHeic) {
        // Try heic-convert first
        try {
          const jpegBuffer = await heicConvert({
            buffer: sourceBuffer,
            format: 'JPEG',
            quality: 0.92
          });
          await writeFile(outPath, jpegBuffer);
        } catch {
          // Fallback: some .HEIC files are actually JPEG — try sharp directly
          await sharp(sourceBuffer)
            .rotate()
            .jpeg({ quality: 92, mozjpeg: true })
            .toFile(outPath);
        }
      } else {
        // PNG — convert to JPEG via sharp
        await sharp(sourceBuffer)
          .rotate()
          .jpeg({ quality: 92, mozjpeg: true })
          .toFile(outPath);
      }

      // Write metadata
      const metadata = {
        title: entry.title,
        slug,
        year: 2025,
        medium: entry.medium,
        dimensions: '24 x 36 in',
        description: entry.desc,
        alt: entry.alt,
        featured: entry.featured,
        categories: entry.categories,
        dominantColor: entry.color,
        sourceImage: 'main.jpg'
      };

      await writeFile(
        path.join(metadataDir, `${slug}.json`),
        JSON.stringify(metadata, null, 2) + '\n',
        'utf8'
      );

      converted++;
      console.log(`OK: ${entry.file} → ${slug}`);
    } catch (err) {
      console.log(`FAIL: ${entry.file} — ${err.message}`);
    }
  }

  console.log(`\nDone: ${converted} converted, ${skipped} skipped`);
}

main().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
