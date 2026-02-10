import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MOOD_LABELS } from '@/types/vibe';
import type { Mood } from '@/types/vibe';

interface SharePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const val = params[key];
  return typeof val === 'string' ? val : '';
}

export async function generateMetadata({
  searchParams,
}: SharePageProps): Promise<Metadata> {
  const params = await searchParams;
  const name = getParam(params, 'name') || 'MAPMAPMAP!!!';
  const catchphrase = getParam(params, 'catchphrase');
  const mood = getParam(params, 'mood') || 'chill';
  const count = getParam(params, 'count');
  const tags = getParam(params, 'tags');
  const image = getParam(params, 'image');

  const isSummary = parseInt(count) > 1;
  const title = isSummary
    ? `${MOOD_LABELS[mood as Mood]?.ja ?? mood}のお気に入り ${count}件 | MAPMAPMAP!!!`
    : `${name} | MAPMAPMAP!!!`;
  const description = catchphrase || `${name}をMAPMAPMAP!!!で発見しました`;

  // Build OG image URL
  const ogParams = new URLSearchParams({ name, mood });
  if (catchphrase) ogParams.set('catchphrase', catchphrase);
  if (tags) ogParams.set('tags', tags);
  if (image) ogParams.set('image', image);
  if (count) ogParams.set('count', count);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://vibe-map.vercel.app';
  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const params = await searchParams;
  const lat = getParam(params, 'lat');
  const lng = getParam(params, 'lng');

  // If the user visits the share URL directly, redirect to the main app
  // with enough context to show the place
  if (lat && lng) {
    redirect(`/?lat=${lat}&lng=${lng}`);
  }

  redirect('/');
}
