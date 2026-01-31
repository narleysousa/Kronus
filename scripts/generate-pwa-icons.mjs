/**
 * Gera ícones PNG a partir de public/logo.svg para Safari/macOS Dock e PWA.
 * Safari no macOS não usa SVG para o ícone do Dock; PNG evita o ícone genérico.
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 * Requer: npm install sharp (devDependency)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const logoSvg = join(publicDir, 'logo.svg');
const sizes = [180, 192, 512]; // 180 = Safari/macOS Dock, 192/512 = PWA

async function main() {
  const svg = readFileSync(logoSvg);
  for (const size of sizes) {
    const out = join(publicDir, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`Gerado: ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
