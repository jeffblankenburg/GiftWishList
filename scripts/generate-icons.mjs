import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Gift icon SVG with rose color background for PWA
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#e11d48"/>
  <g transform="translate(96, 96) scale(1.25)">
    <rect x="48" y="128" width="288" height="64" rx="16" fill="white"/>
    <path d="M192 128v208" stroke="white" stroke-width="24" stroke-linecap="round"/>
    <path d="M304 192v112a32 32 0 0 1-32 32H112a32 32 0 0 1-32-32V192" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M120 128a40 40 0 0 1 0-80c36 0 60 40 72 80c12-40 36-80 72-80a40 40 0 0 1 0 80" stroke="white" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

async function generateIcons() {
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  // Generate 192x192 icon
  await sharp(Buffer.from(svgIcon))
    .resize(192, 192)
    .png()
    .toFile(join(iconsDir, 'icon-192x192.png'));

  console.log('Generated icon-192x192.png');

  // Generate 512x512 icon
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(join(iconsDir, 'icon-512x512.png'));

  console.log('Generated icon-512x512.png');

  // Generate favicon.ico (32x32)
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.png'));

  console.log('Generated favicon.png');

  // Generate Apple touch icon (180x180)
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, 'apple-touch-icon.png'));

  console.log('Generated apple-touch-icon.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
