import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  /** JSON-LD structured data object */
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

const SITE_NAME = 'Esportra';
const DEFAULT_DESCRIPTION = 'Esportra — the competitive esports tournament platform. Create, join, and manage tournaments for Valorant, CS2, League of Legends, and more.';
const BASE_URL = import.meta.env.VITE_APP_URL || 'https://esportra.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const IS_STAGING = window.location.hostname.includes('staging');

/**
 * Reusable SEO head component. Place at the top of any page component
 * to set dynamic meta tags, Open Graph, Twitter cards, and JSON-LD.
 */
const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  jsonLd,
  noindex = false,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Competitive Esports Tournament Platform`;
  const canonicalUrl = url ? `${BASE_URL}${url}` : undefined;
  const shouldNoindex = noindex || IS_STAGING;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {shouldNoindex && <meta name="robots" content="noindex,nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
