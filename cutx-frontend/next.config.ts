import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.bcommebois.fr',
      },
      {
        protocol: 'https',
        hostname: 'bcommebois.fr',
      },
      {
        protocol: 'https',
        hostname: 'www.dispano.fr',
      },
      {
        protocol: 'https',
        hostname: 'dispano.fr',
      },
      {
        protocol: 'https',
        hostname: '*.egger.com',
      },
      {
        protocol: 'https',
        hostname: 'www.panneauxonline.fr',
      },
      {
        protocol: 'https',
        hostname: 'panneauxonline.fr',
      },
      {
        protocol: 'https',
        hostname: 'www.barillet-distribution.fr',
      },
      {
        protocol: 'https',
        hostname: 'barillet-distribution.fr',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
