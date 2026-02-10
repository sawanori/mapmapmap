import { describe, it, expect, vi } from 'vitest';

// Mock @vercel/og since it requires edge runtime
vi.mock('@vercel/og', () => ({
  ImageResponse: class {
    body: unknown;
    status: number;
    headers: Map<string, string>;
    constructor(element: unknown, options?: { width?: number; height?: number }) {
      this.body = element;
      this.status = 200;
      this.headers = new Map([
        ['content-type', 'image/png'],
        ['cache-control', 'public, max-age=86400'],
      ]);
      // Verify options passed
      if (options?.width) {
        this.headers.set('x-width', String(options.width));
      }
    }
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/og');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('OG Image API', () => {
  it('should return a response', async () => {
    const response = await GET(makeRequest({ name: 'カフェ モカ' }));
    expect(response.status).toBe(200);
  });

  it('should accept name parameter', async () => {
    const response = await GET(
      makeRequest({
        name: 'カフェ モカ',
        catchphrase: '夜に溶ける珈琲の香り',
        mood: 'chill',
        tags: '#深夜の読書,#照明暗め,#一人時間',
      }),
    );
    expect(response.status).toBe(200);
  });

  it('should handle party mood', async () => {
    const response = await GET(
      makeRequest({ name: 'Bar XYZ', mood: 'party' }),
    );
    expect(response.status).toBe(200);
  });

  it('should handle focus mood', async () => {
    const response = await GET(
      makeRequest({ name: 'Work Cafe', mood: 'focus' }),
    );
    expect(response.status).toBe(200);
  });

  it('should handle summary mode with count > 1', async () => {
    const response = await GET(
      makeRequest({ name: 'まったり', count: '5' }),
    );
    expect(response.status).toBe(200);
  });

  it('should work with default parameters', async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
  });

  it('should handle image URL parameter', async () => {
    const response = await GET(
      makeRequest({
        name: 'Test',
        image: 'https://example.com/photo.jpg',
      }),
    );
    expect(response.status).toBe(200);
  });
});
