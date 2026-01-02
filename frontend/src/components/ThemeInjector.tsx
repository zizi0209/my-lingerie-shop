'use client';

import { useEffect } from 'react';

interface ThemeInjectorProps {
  primaryColor: string;
}

/**
 * Injects CSS custom properties for monochromatic color system
 * Generates 11 shades (50-950) from primary color
 */
export function ThemeInjector({ primaryColor }: ThemeInjectorProps) {
  useEffect(() => {
    if (!primaryColor) return;

    // Cache color to localStorage for instant loading
    localStorage.setItem('primary_color', primaryColor);

    // Generate all shades
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const root = document.documentElement;

    shades.forEach(shade => {
      const color = generateMonochromaticShade(primaryColor, shade);
      root.style.setProperty(`--primary-${shade}`, color);
    });

    // Set semantic variables for easy use
    root.style.setProperty('--primary', generateMonochromaticShade(primaryColor, 500));
    root.style.setProperty('--primary-hover', generateMonochromaticShade(primaryColor, 600));
    root.style.setProperty('--primary-active', generateMonochromaticShade(primaryColor, 700));
    root.style.setProperty('--primary-light', generateMonochromaticShade(primaryColor, 100));
    root.style.setProperty('--primary-dark', generateMonochromaticShade(primaryColor, 900));

  }, [primaryColor]);

  return null;
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
