const UMAMI_SCRIPT_URL = 'https://umami.server.techwarely.com/script.js';
const UMAMI_WEBSITE_ID = '86fae0b5-1a0d-4c13-aa51-082bab29af48';

export function Umami() {
  return <script defer src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_WEBSITE_ID} />;
}
