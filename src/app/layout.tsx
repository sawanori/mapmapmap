import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Context-Map -- 雰囲気でスポットを探す',
  description:
    '気分にぴったりのスポットを発見。地図上でセマンティック検索。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${geist.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
