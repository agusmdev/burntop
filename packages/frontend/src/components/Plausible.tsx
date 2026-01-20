/**
 * Plausible Analytics Script Component
 *
 * Privacy-friendly analytics using Plausible.
 * Only loads if VITE_PLAUSIBLE_DOMAIN is set.
 *
 * @see https://plausible.io/docs/plausible-script
 * @see plan.md Phase 18.3 - Monitoring
 */

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API_HOST = import.meta.env.VITE_PLAUSIBLE_API_HOST || 'https://plausible.io';

export function Plausible() {
  // Don't load analytics in development or if domain is not configured
  if (!PLAUSIBLE_DOMAIN || import.meta.env.DEV) {
    return null;
  }

  return <script defer data-domain={PLAUSIBLE_DOMAIN} src={`${PLAUSIBLE_API_HOST}/js/script.js`} />;
}
