/**
 * Homepage seed data. Inline SVG thumbnails keep the prototype offline and
 * hydration-safe.
 */

export type LiveShow = {
  slug: string;
  title: string;
  host: string;
  category: string;
  viewers: number;
  pinnedProduct?: string;
  isLive: boolean;
  thumbnailUrl: string;
};

function thumbnail(label: string, tone: number): string {
  const bg = `hsl(0 0% ${tone}%)`;
  const fg = tone > 50 ? "#00000055" : "#ffffff88";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${bg}"/><text x="320" y="188" fill="${fg}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" letter-spacing="3" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MOCK_LIVE_SHOWS: LiveShow[] = [
  {
    slug: "winter-layers",
    title: "Winter layers under $100",
    host: "Maya Chen",
    category: "Apparel",
    viewers: 1284,
    pinnedProduct: "Merino Crew Neck Sweater",
    isLive: true,
    thumbnailUrl: thumbnail("LIVE", 18),
  },
  {
    slug: "skincare-reset",
    title: "Skincare reset — dupes & splurges",
    host: "Jordan Lee",
    category: "Beauty",
    viewers: 842,
    pinnedProduct: "Hydrating Lip Balm Duo",
    isLive: true,
    thumbnailUrl: thumbnail("LIVE", 72),
  },
  {
    slug: "trail-prep",
    title: "Trail prep: packable gear",
    host: "Sam Ortiz",
    category: "Outdoors",
    viewers: 391,
    isLive: true,
    thumbnailUrl: thumbnail("LIVE", 42),
  },
];

export const MOCK_UPCOMING_SHOWS: LiveShow[] = [
  {
    slug: "spring-denim",
    title: "Spring denim try-on",
    host: "Maya Chen",
    category: "Apparel",
    viewers: 0,
    isLive: false,
    thumbnailUrl: thumbnail("SOON", 88),
  },
  {
    slug: "home-essentials",
    title: "Home essentials under $50",
    host: "Priya Nair",
    category: "Home",
    viewers: 0,
    isLive: false,
    thumbnailUrl: thumbnail("SOON", 92),
  },
];

export const MOCK_SHOWS: LiveShow[] = [
  ...MOCK_LIVE_SHOWS,
  ...MOCK_UPCOMING_SHOWS,
];

export function getMockShow(slug: string): LiveShow | undefined {
  return MOCK_SHOWS.find((show) => show.slug === slug);
}
