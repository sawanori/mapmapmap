import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'MAPMAPMAP!!!';
  const catchphrase = searchParams.get('catchphrase') ?? '';
  const mood = searchParams.get('mood') ?? 'chill';
  const tags = searchParams.get('tags') ?? '';
  const imageUrl = searchParams.get('image') ?? '';
  const count = searchParams.get('count') ?? '1';

  const moodColors: Record<string, { from: string; to: string }> = {
    chill: { from: '#1e3a5f', to: '#0f172a' },
    party: { from: '#7c3aed', to: '#1e1b4b' },
    focus: { from: '#065f46', to: '#022c22' },
  };

  const colors = moodColors[mood] ?? moodColors.chill;
  const tagList = tags ? tags.split(',').slice(0, 3) : [];
  const isSummary = parseInt(count) > 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background image */}
        {imageUrl && (
          <img
            src={imageUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.4,
            }}
            alt=""
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '48px',
            position: 'relative',
            gap: '16px',
          }}
        >
          {/* MAPMAPMAP!!! branding */}
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.1em',
            }}
          >
            MAPMAPMAP!!!
          </div>

          {/* Place name or summary title */}
          <div
            style={{
              display: 'flex',
              fontSize: isSummary ? '40px' : '48px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
            }}
          >
            {isSummary ? `${name}のお気に入り ${count}件` : name}
          </div>

          {/* Catchphrase */}
          {catchphrase && (
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.5,
              }}
            >
              {catchphrase}
            </div>
          )}

          {/* Tags */}
          {tagList.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px',
              }}
            >
              {tagList.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    padding: '6px 16px',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.9)',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  {tag.trim()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
