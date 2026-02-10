import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read the Map component source to verify mobile-specific configurations
const mapSource = readFileSync(
  resolve(__dirname, './Map.tsx'),
  'utf-8'
);

describe('Map component mobile configuration', () => {
  it('uses 100dvh for full viewport height (not 100vh) for iOS Safari', () => {
    expect(mapSource).toContain('100dvh');
  });

  it('uses 100vw for full viewport width', () => {
    expect(mapSource).toContain('100vw');
  });

  it('has touch-none class to prevent scroll-through on touch devices', () => {
    expect(mapSource).toContain('touch-none');
  });
});
