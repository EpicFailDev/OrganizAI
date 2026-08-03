#!/usr/bin/env node
/**
 * PWA Icon Generator
 * Generates PNG icons from the custom clipboard.svg favicon.
 * 
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG wrapper that embeds the custom icon at any size
function wrapIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <image href="/favicon.svg" x="0" y="0" width="${size}" height="${size}" />
</svg>`;
}

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons at each size
for (const size of SIZES) {
  const svg = wrapIconSVG(size);
  const filePath = join(iconsDir, `icon-${size}x${size}.svg`);
  writeFileSync(filePath, svg, 'utf-8');
  console.log(`✓ Generated icon-${size}x${size}.svg`);
}

console.log('\n✅ All icon sizes generated from custom clipboard.svg');
console.log('   Using SVG icons for PWA - browsers support SVG icons natively.');
