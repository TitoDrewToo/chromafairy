import type { Metadata } from "next";
import GlobalPageTransition from "../components/global-page-transition";
import ClientErrorMonitor from "../components/client-error-monitor";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Chroma Fairy", template: "%s · Chroma Fairy" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: { type: "website", siteName: SITE_NAME, title: "Chroma Fairy", description: SITE_DESCRIPTION, url: SITE_URL, images: [{ url: absoluteUrl("/fairy-logo-option-v2.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Chroma Fairy", description: SITE_DESCRIPTION, images: [absoluteUrl("/fairy-logo-option-v2.png")] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&family=WindSong:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" as="audio" href="/audio/mixkit-distant-sea-humming-ambiance-1191.mp3" type="audio/mpeg" />
        <link rel="preload" as="image" href="/assets/paintings/01_IMG_8693.jpg" type="image/jpeg" />
      </head>
      <body><ClientErrorMonitor /><GlobalPageTransition>{children}</GlobalPageTransition></body>
    </html>
  );
}
