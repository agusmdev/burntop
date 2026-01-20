/**
 * OG Image Rendering Utilities
 *
 * Provides functions to render React components to PNG images
 * using Satori (JSX to SVG) and Resvg (SVG to PNG)
 */

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { OG_IMAGE_DIMENSIONS } from './base-card-template';

import type { ReactElement } from 'react';

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface FontConfig {
  name: string;
  data: ArrayBuffer;
  weight?: FontWeight;
  style?: 'normal' | 'italic';
}

/**
 * Options for rendering OG images
 */
interface RenderCardOptions {
  /**
   * Width of the generated image
   * @default 1200
   */
  width?: number;

  /**
   * Height of the generated image
   * @default 630
   */
  height?: number;

  /**
   * Fonts to use for rendering
   * If not provided, fetches Inter font from Google Fonts
   */
  fonts?: FontConfig[];

  /**
   * Enable debug mode (logs SVG output)
   * @default false
   */
  debug?: boolean;
}

// Cache for loaded fonts to avoid re-fetching
let cachedFonts: FontConfig[] | null = null;

/**
 * Fetches default fonts from Google Fonts
 * Uses Inter font family which is similar to Geist
 */
async function getDefaultFonts(): Promise<FontConfig[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  try {
    // Fetch Inter Regular (400) and Bold (700) from Google Fonts
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

    cachedFonts = [
      {
        name: 'Inter',
        data: regularBuffer,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: boldBuffer,
        weight: 700,
        style: 'normal',
      },
    ];

    return cachedFonts;
  } catch (error) {
    console.error('[OG] Failed to fetch default fonts:', error);
    throw new Error('Failed to load fonts for OG image rendering');
  }
}

/**
 * Renders a React element to a PNG image buffer
 *
 * @param element - React component to render
 * @param options - Rendering options
 * @returns PNG image as Buffer
 *
 * @example
 * ```ts
 * const card = <BaseCardTemplate title="Hello">Content</BaseCardTemplate>;
 * const png = await renderCardToPng(card);
 * ```
 */
export async function renderCardToPng(
  element: ReactElement,
  options: RenderCardOptions = {}
): Promise<Buffer> {
  const {
    width = OG_IMAGE_DIMENSIONS.width,
    height = OG_IMAGE_DIMENSIONS.height,
    fonts,
    debug = false,
  } = options;

  try {
    // Load fonts - use provided fonts or fetch default Inter fonts
    const fontsToUse = fonts && fonts.length > 0 ? fonts : await getDefaultFonts();

    // Step 1: Convert React element to SVG using Satori
    const svg = await satori(element, {
      width,
      height,
      fonts: fontsToUse,
    });

    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[OG] Generated SVG:', svg);
    }

    // Step 2: Convert SVG to PNG using Resvg
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: width,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[OG] Generated PNG buffer, size:', pngBuffer.length, 'bytes');
    }

    return pngBuffer;
  } catch (error) {
    console.error('[OG] Failed to render card:', error);
    throw new Error(
      `Failed to render OG image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Renders a React element to SVG string
 * Useful for debugging or serving SVG directly
 *
 * @param element - React component to render
 * @param options - Rendering options (only width, height, fonts)
 * @returns SVG as string
 */
export async function renderCardToSvg(
  element: ReactElement,
  options: RenderCardOptions = {}
): Promise<string> {
  const {
    width = OG_IMAGE_DIMENSIONS.width,
    height = OG_IMAGE_DIMENSIONS.height,
    fonts = [],
  } = options;

  try {
    const svg = await satori(element, {
      width,
      height,
      fonts,
    } as never);

    return svg;
  } catch (error) {
    console.error('[OG] Failed to render card to SVG:', error);
    throw new Error(
      `Failed to render OG image to SVG: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Loads a font file from the file system
 * Helper for loading Geist fonts for OG image rendering
 *
 * @param fontPath - Path to font file
 * @param weight - Font weight
 * @param style - Font style
 * @returns Font configuration object
 */
export async function loadFont(
  fontPath: string,
  weight: FontWeight = 400,
  style: 'normal' | 'italic' = 'normal'
): Promise<FontConfig> {
  try {
    // In Node.js environment (server-side)
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(fontPath);

    return {
      name: 'Geist',
      data: data.buffer as ArrayBuffer,
      weight,
      style,
    };
  } catch (error) {
    console.error('[OG] Failed to load font:', fontPath, error);
    throw new Error(`Failed to load font: ${fontPath}`);
  }
}

/**
 * Creates HTTP response headers for PNG image
 * Includes caching headers for CDN optimization
 *
 * @param cacheDuration - Cache duration in seconds (default: 1 hour)
 * @returns Headers object
 */
export function createImageHeaders(cacheDuration: number = 3600): Record<string, string> {
  return {
    'Content-Type': 'image/png',
    'Cache-Control': `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
  };
}

/**
 * Creates HTTP response headers for SVG image
 *
 * @param cacheDuration - Cache duration in seconds (default: 1 hour)
 * @returns Headers object
 */
export function createSvgHeaders(cacheDuration: number = 3600): Record<string, string> {
  return {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
  };
}
