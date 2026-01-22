import type { JSX } from 'react';

/**
 * SEO Utilities and JSON-LD Schema Generation
 *
 * Provides utilities for generating meta tags, Open Graph tags,
 * Twitter Card tags, and JSON-LD structured data for search engines.
 */

/**
 * Get the base URL depending on the environment
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NODE_ENV === 'production' ? 'https://burntop.dev' : 'http://localhost:3000';
}

/**
 * Generate Open Graph meta tags
 */
export interface OGMetaProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article' | 'profile' | 'music.song';
  siteName?: string;
}

export function generateOGMeta(props: OGMetaProps) {
  const {
    title,
    description,
    url,
    image,
    imageWidth = 1200,
    imageHeight = 630,
    type = 'website',
    siteName = 'burntop.dev',
  } = props;

  const meta: Array<{ property: string; content: string } | { name: string; content: string }> = [
    {
      property: 'og:title',
      content: title,
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:url',
      content: url,
    },
    {
      property: 'og:type',
      content: type,
    },
    {
      property: 'og:site_name',
      content: siteName,
    },
  ];

  if (image) {
    meta.push(
      {
        property: 'og:image',
        content: image,
      },
      {
        property: 'og:image:width',
        content: imageWidth.toString(),
      },
      {
        property: 'og:image:height',
        content: imageHeight.toString(),
      }
    );
  }

  return meta;
}

/**
 * Generate Twitter Card meta tags
 */
export interface TwitterCardMetaProps {
  title: string;
  description: string;
  image?: string;
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
}

export function generateTwitterCardMeta(props: TwitterCardMetaProps) {
  const { title, description, image, card = 'summary_large_image', site = '@agusmdev' } = props;

  const meta: Array<{ name: string; content: string }> = [
    {
      name: 'twitter:card',
      content: card,
    },
    {
      name: 'twitter:title',
      content: title,
    },
    {
      name: 'twitter:description',
      content: description,
    },
  ];

  if (site) {
    meta.push({
      name: 'twitter:site',
      content: site,
    });
  }

  if (image) {
    meta.push({
      name: 'twitter:image',
      content: image,
    });
  }

  return meta;
}

/**
 * JSON-LD Schema Types
 */

export interface OrganizationSchema extends Record<string, unknown> {
  '@context': string;
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    contactType: string;
    email: string;
  };
}

/**
 * Generate Organization JSON-LD schema
 */
export function generateOrganizationSchema(): OrganizationSchema {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'burntop',
    url: baseUrl,
    logo: `${baseUrl}/flame_logo_512px.png`,
    description:
      'Open source AI usage tracking for developers. Track your usage across Claude, Cursor, ChatGPT, and more.',
    sameAs: ['https://github.com/agusmdev/burntop', 'https://x.com/agusmdev'],
  };
}

export interface WebSiteSchema extends Record<string, unknown> {
  '@context': string;
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

/**
 * Generate WebSite JSON-LD schema
 */
export function generateWebSiteSchema(): WebSiteSchema {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'burntop.dev',
    url: baseUrl,
    description:
      'Gamified AI usage tracking for developers. Track tokens, costs, and usage patterns across AI tools.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/leaderboard?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface PersonSchema extends Record<string, unknown> {
  '@context': string;
  '@type': 'Person';
  name: string;
  url: string;
  image?: string;
  description?: string;
  sameAs?: string[];
  mainEntityof?: string;
}

/**
 * Generate Person JSON-LD schema for user profiles
 */
export function generatePersonSchema(props: {
  username: string;
  displayName?: string;
  image?: string;
  bio?: string;
  github?: string;
  twitter?: string;
  website?: string;
}): PersonSchema {
  const baseUrl = getBaseUrl();
  const { username, displayName, image, bio, github, twitter, website } = props;

  const sameAs: string[] = [];
  if (github) sameAs.push(github);
  if (twitter) sameAs.push(twitter);
  if (website) sameAs.push(website);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName || username,
    url: `${baseUrl}/p/${username}`,
    image,
    description:
      bio || `View ${username}'s AI usage stats, streak, and achievements on burntop.dev`,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

export interface BreadcrumbListSchema extends Record<string, unknown> {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Generate BreadcrumbList JSON-LD schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; item: string }>
): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export interface ArticleSchema extends Record<string, unknown> {
  '@context': string;
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  image?: string;
  author: string;
  datePublished?: string;
  dateModified?: string;
  url: string;
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: string;
  };
}

/**
 * Generate Article JSON-LD schema
 */
export function generateArticleSchema(props: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}): ArticleSchema {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    url: props.url,
    image: props.image,
    author: 'burntop',
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    publisher: {
      '@type': 'Organization',
      name: 'burntop',
      logo: `${baseUrl}/flame_logo_512px.png`,
    },
  };
}

/**
 * Inject JSON-LD schema into the document
 * This creates a script tag with the schema data
 */
export function createJsonLdTag(
  schema:
    | Record<string, unknown>
    | OrganizationSchema
    | WebSiteSchema
    | PersonSchema
    | BreadcrumbListSchema
    | ArticleSchema
): JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2),
      }}
    />
  );
}

/**
 * Default Open Graph image
 */
export const DEFAULT_OG_IMAGE = '/flame_logo_512px.png';
