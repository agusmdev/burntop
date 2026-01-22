import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { HomepageOGTemplate } from '../src/lib/og/homepage-og-template';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function loadFonts() {
  const [regularResponse, boldResponse] = await Promise.all([
    fetch(
      'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
    ),
    fetch(
      'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff'
    ),
  ]);

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ]);

  return [
    { name: 'Inter', data: regularBuffer, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: boldBuffer, weight: 700 as const, style: 'normal' as const },
  ];
}

async function main() {
  console.log('Generating homepage OG image...');

  const fonts = await loadFonts();
  console.log('Fonts loaded');

  const element = HomepageOGTemplate();

  const svg = await satori(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  console.log('SVG generated');

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  console.log('PNG rendered, size:', pngBuffer.length, 'bytes');

  const outputPath = join(import.meta.dirname, '../public/og-home.png');
  await writeFile(outputPath, pngBuffer);
  console.log('Saved to:', outputPath);
}

main().catch(console.error);
