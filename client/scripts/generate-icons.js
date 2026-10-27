import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const svgPath = path.join(publicDir, 'favicon.svg');

async function generateIcons() {
  console.log('Generating icons from favicon.svg...');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log(' - Generated apple-touch-icon.png (180x180)');

  // 2. icon-192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log(' - Generated icon-192.png (192x192)');

  // 3. icon-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log(' - Generated icon-512.png (512x512)');

  // 4. Temporary 32x32 png for favicon.ico
  const temp32Png = path.join(publicDir, 'temp-32.png');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(temp32Png);

  const icoBuffer = await pngToIco(temp32Png);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.unlinkSync(temp32Png);
  console.log(' - Generated favicon.ico (32x32)');

  console.log('Icon generation complete!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
