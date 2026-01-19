import { cache } from 'react';

export interface StoreConfig {
  primary_color: string;
  store_name: string;
  store_logo?: string;
  store_description?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_zalo?: string;
}

/**
 * Server-side function to fetch theme config
 * Cached per request using React cache()
 */
export const getServerTheme = cache(async (): Promise<StoreConfig> => {
  try {
    // Use environment variable - backend runs on port 5000
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const url = `${baseUrl}/public/config`;
    
    // Fetch with no-cache to always get fresh data
    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.status}`);
    }

    const data = await response.json();
    const config = data.data || {};
    
    return {
      primary_color: config.primary_color || '#f43f5e',
      store_name: config.store_name || 'Lingerie Shop',
      store_logo: config.store_logo,
      store_description: config.store_description,
      store_email: config.store_email,
      store_phone: config.store_phone,
      store_address: config.store_address,
      social_facebook: config.social_facebook,
      social_instagram: config.social_instagram,
      social_tiktok: config.social_tiktok,
      social_zalo: config.social_zalo,
    };
  } catch (error) {
    console.error('[SSR] Config fetch error:', error);
    return {
      primary_color: '#f43f5e',
      store_name: 'Lingerie Shop',
    };
  }
});

/**
 * Generate CSS variables string for inline styles
 */
export function generateThemeCSS(primaryColor: string): string {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  // Generate CSS with !important to override globals.css fallback values
  const cssVars = shades.map(shade => {
    const color = generateMonochromaticShade(primaryColor, shade);
    return `--primary-${shade}: ${color} !important;`;
  }).join('\n    ');

  // Add semantic variables with !important
  const semanticVars = `
    --primary: ${generateMonochromaticShade(primaryColor, 500)} !important;
    --primary-hover: ${generateMonochromaticShade(primaryColor, 600)} !important;
    --primary-active: ${generateMonochromaticShade(primaryColor, 700)} !important;
    --primary-light: ${generateMonochromaticShade(primaryColor, 100)} !important;
    --primary-dark: ${generateMonochromaticShade(primaryColor, 900)} !important;
  `;

  return cssVars + semanticVars;
}

// Helper: Generate monochromatic shade using HSL
function generateMonochromaticShade(hexColor: string, shade: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  let newL: number;
  if (shade === 50) newL = 0.97;
  else if (shade === 100) newL = 0.94;
  else if (shade === 200) newL = 0.86;
  else if (shade === 300) newL = 0.74;
  else if (shade === 400) newL = 0.62;
  else if (shade === 500) newL = l;
  else if (shade === 600) newL = l * 0.85;
  else if (shade === 700) newL = l * 0.7;
  else if (shade === 800) newL = l * 0.55;
  else if (shade === 900) newL = l * 0.4;
  else if (shade === 950) newL = l * 0.25;
  else newL = l;

  let newS = s;
  if (shade <= 200) newS = s * 0.85;
  if (shade >= 800) newS = s * 1.1;

  return hslToRgb(h, newS, newL);
}

function hslToRgb(h: number, s: number, l: number): string {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
