import { pathToFileURL } from "node:url";
import {
  ConfidenceLevel,
  DiscoveredCompetitor,
  DiscoveryRequest,
  assertSafeToProceed,
  dedupe,
  logSection,
  namesMatch,
  nowIso,
  parseArgs,
  readJsonFile,
  requireInput,
  slugify,
  toSlugSet,
  writeJsonFile,
} from "./_shared.js";

interface LocaleVariant {
  locale: string;
  product_url?: string;
  login_url?: string;
  start_url?: string;
}

interface CompetitorCatalogEntry {
  competitor_name: string;
  product_url: string;
  login_url: string;
  start_url?: string;
  product_category: string;
  keywords: string[];
  base_reason: string;
  default_confidence: ConfidenceLevel;
  locale_variants?: LocaleVariant[];
}

interface ResolvedCatalogEntry {
  competitor_name: string;
  product_url: string;
  login_url: string;
  start_url?: string;
  product_category: string;
  keywords: string[];
  base_reason: string;
  default_confidence: ConfidenceLevel;
}

const COMPETITOR_CATALOG: CompetitorCatalogEntry[] = [
  {
    competitor_name: "Stripe",
    product_url: "https://stripe.com/payments/payment-links",
    login_url: "https://dashboard.stripe.com/login",
    product_category: "payments",
    keywords: ["payment", "link", "merchant", "checkout", "branding", "dashboard", "reusable", "expiration"],
    base_reason: "Strong fit for merchant payment-link creation, branding controls, and operational management.",
    default_confidence: "high",
  },
  {
    competitor_name: "Square",
    product_url: "https://squareup.com/us/en/payments",
    login_url: "https://app.squareup.com/login?return_to=%2Fdashboard%2Fpayment-links",
    start_url: "https://app.squareup.com/dashboard/payment-links",
    product_category: "payments",
    keywords: ["payment", "seller", "checkout", "link", "merchant", "store", "reusable"],
    base_reason: "Mature seller tooling with reusable checkout and payment collection journeys.",
    default_confidence: "high",
    locale_variants: [
      {
        locale: "es-ES",
        product_url: "https://squareup.com/es/es/payment-links",
        login_url: "https://app.squareup.com/login?return_to=%2Fdashboard%2Fpayment-links",
        start_url: "https://app.squareup.com/dashboard/payment-links",
      },
    ],
  },
  {
    competitor_name: "PayPal",
    product_url: "https://www.paypal.com/us/business/accept-payments/payment-links",
    login_url: "https://www.paypal.com/signin",
    product_category: "payments",
    keywords: ["payment", "invoice", "link", "merchant", "checkout"],
    base_reason: "Widely used merchant payment-link and invoice flow with account-based management.",
    default_confidence: "medium",
  },
  {
    competitor_name: "Adyen",
    product_url: "https://www.adyen.com/payment-methods/payment-links",
    login_url: "https://ca-live.adyen.com/ca/ca/login.shtml",
    product_category: "payments",
    keywords: ["payment", "link", "merchant", "enterprise", "dashboard"],
    base_reason: "Enterprise payment-link offering with operational controls and back-office review flows.",
    default_confidence: "medium",
  },
  {
    competitor_name: "Mollie",
    product_url: "https://www.mollie.com/payments/payment-links",
    login_url: "https://my.mollie.com/dashboard/",
    product_category: "payments",
    keywords: ["payment", "link", "merchant", "checkout", "dashboard"],
    base_reason: "SMB-friendly payment-link workflow with product management and dashboard-based follow-up.",
    default_confidence: "medium",
  },
  {
    competitor_name: "Razorpay",
    product_url: "https://razorpay.com/payment-links/",
    login_url: "https://dashboard.razorpay.com/signin",
    product_category: "payments",
    keywords: ["payment", "link", "merchant", "brand", "dashboard"],
    base_reason: "Payment-link product with configuration and dashboard-based post-creation management.",
    default_confidence: "medium",
  },
  {
    competitor_name: "SumUp",
    product_url: "https://www.sumup.com/en-us/business-guide/payment-links/",
    login_url: "https://me.sumup.com/en-us/login",
    product_category: "payments",
    keywords: ["payment", "link", "seller", "merchant", "checkout"],
    base_reason: "Seller-focused payment-link and remote checkout tooling with real logged-in flows.",
    default_confidence: "medium",
  },
  {
    competitor_name: "Checkout.com",
    product_url: "https://www.checkout.com/products/payment-links",
    login_url: "https://hub.checkout.com/",
    product_category: "payments",
    keywords: ["payment", "link", "merchant", "enterprise", "operations"],
    base_reason: "Operational payment-link product for merchants with dashboard-oriented setup patterns.",
    default_confidence: "medium",
  },
  {
    competitor_name: "HubSpot",
    product_url: "https://www.hubspot.com/products/payments",
    login_url: "https://app.hubspot.com/login",
    product_category: "commerce",
    keywords: ["payment", "link", "crm", "merchant", "checkout"],
    base_reason: "Includes payment-link flows embedded in a broader CRM and commerce experience.",
    default_confidence: "low",
  },
  {
    competitor_name: "Typeform",
    product_url: "https://www.typeform.com/payments/",
    login_url: "https://admin.typeform.com/login",
    product_category: "forms",
    keywords: ["payment", "form", "checkout", "link", "brand"],
    base_reason: "Relevant for branded paywall-like flows and reusable hosted link experiences.",
    default_confidence: "low",
  },
];

function loadCatalog(catalogPath?: string): CompetitorCatalogEntry[] {
  if (!catalogPath) {
    return COMPETITOR_CATALOG;
  }

  const catalog = readJsonFile<{ competitors: CompetitorCatalogEntry[] }>(catalogPath);
  if (!Array.isArray(catalog.competitors) || catalog.competitors.length === 0) {
    throw new Error(`Catalog file did not contain any competitors: ${catalogPath}`);
  }
  return catalog.competitors;
}

function normalizeLocale(locale: string): string {
  return locale.trim().toLowerCase();
}

function localeMatches(requestedLocale: string, candidateLocale: string): boolean {
  const requested = normalizeLocale(requestedLocale);
  const candidate = normalizeLocale(candidateLocale);
  if (requested === candidate) {
    return true;
  }
  const requestedLanguage = requested.split("-")[0] ?? requested;
  const candidateLanguage = candidate.split("-")[0] ?? candidate;
  return requestedLanguage.length > 0 && requestedLanguage === candidateLanguage;
}

function resolveCatalogEntry(entry: CompetitorCatalogEntry, locale?: string): ResolvedCatalogEntry {
  const variant = locale
    ? entry.locale_variants?.find((candidate) => normalizeLocale(candidate.locale) === normalizeLocale(locale)) ??
      entry.locale_variants?.find((candidate) => localeMatches(locale, candidate.locale))
    : undefined;

  return {
    competitor_name: entry.competitor_name,
    product_url: variant?.product_url ?? entry.product_url,
    login_url: variant?.login_url ?? entry.login_url,
    ...(variant?.start_url ?? entry.start_url ? { start_url: variant?.start_url ?? entry.start_url } : {}),
    product_category: entry.product_category,
    keywords: entry.keywords,
    base_reason: entry.base_reason,
    default_confidence: entry.default_confidence,
  };
}

function tokenize(value: string): string[] {
  return dedupe(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  );
}

function buildReason(entry: CompetitorCatalogEntry, matches: string[]): string {
  if (matches.length === 0) {
    return entry.base_reason;
  }
  return `${entry.base_reason} Keyword match: ${matches.slice(0, 5).join(", ")}.`;
}

function confidenceFromScore(score: number, fallback: ConfidenceLevel): ConfidenceLevel {
  if (score >= 4) {
    return "high";
  }
  if (score >= 2) {
    return "medium";
  }
  return fallback;
}

function isCompanyExclusion(entryName: string, companyName?: string): boolean {
  if (!companyName) {
    return false;
  }

  if (namesMatch(entryName, companyName)) {
    return true;
  }

  const companyTokens = tokenize(companyName);
  const entryTokens = tokenize(entryName);
  return entryTokens.length > 0 && entryTokens.every((token) => companyTokens.includes(token));
}

export function discoverCompetitors(request: DiscoveryRequest): DiscoveredCompetitor[] {
  assertSafeToProceed(request);
  const catalog = loadCatalog(request.catalog_path);
  const featureTokens = tokenize(request.feature_description);
  const allowlist = toSlugSet(request.competitor_allowlist ?? []);
  const allowlistIsActive = allowlist.size > 0;
  const minCompetitors = request.min_competitors ?? 5;
  const maxCompetitors = request.max_competitors ?? 8;

  const ranked = catalog
    .filter((entry) => !isCompanyExclusion(entry.competitor_name, request.company_name))
    .filter((entry) => !allowlistIsActive || allowlist.has(slugify(entry.competitor_name)))
    .map((entry) => {
      const resolvedEntry = resolveCatalogEntry(entry, request.locale);
      const keywordMatches = resolvedEntry.keywords.filter((keyword) => featureTokens.includes(keyword));
      const categoryBoost = featureTokens.some((token) => ["payment", "merchant", "checkout", "link"].includes(token))
        ? resolvedEntry.product_category === "payments"
          ? 2
          : 0
        : 0;
      const score = keywordMatches.length + categoryBoost;
      return {
        entry: resolvedEntry,
        keywordMatches,
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.entry.competitor_name.localeCompare(right.entry.competitor_name);
    });

  if (allowlistIsActive && ranked.length === 0) {
    throw new Error(
      `No competitors matched competitor_allowlist: ${[...allowlist].join(", ")}. Update the catalog or allowlist values before discovery.`,
    );
  }

  const shortlisted = ranked
    .slice(0, allowlistIsActive ? ranked.length : Math.max(minCompetitors, Math.min(maxCompetitors, ranked.length)))
    .map<DiscoveredCompetitor>(({ entry, keywordMatches, score }) => ({
      competitor_name: entry.competitor_name,
      product_url: entry.product_url,
      login_url: entry.login_url,
      ...(entry.start_url ? { start_url: entry.start_url } : {}),
      reason_for_inclusion: buildReason(entry, keywordMatches),
      confidence: confidenceFromScore(score, entry.default_confidence),
      product_category: entry.product_category,
      keyword_matches: keywordMatches,
    }));

  return shortlisted;
}

async function main(): Promise<void> {
  const input = requireInput<DiscoveryRequest>(
    process.argv.slice(2),
    "Usage: npm run discover -- --input ./input/discovery.json --output ./runs/discovery.json",
  );
  const args = parseArgs(process.argv.slice(2));
  const discovered = discoverCompetitors(input);
  const outputPath = args.output;

  logSection("Competitor Discovery");
  console.log(`Generated ${discovered.length} competitors at ${nowIso()}.`);
  for (const competitor of discovered) {
    console.log(`- ${competitor.competitor_name}: ${competitor.reason_for_inclusion}`);
  }

  if (outputPath) {
    writeJsonFile(outputPath, discovered);
    console.log(`\nSaved discovery output to ${outputPath}`);
  } else {
    console.log(`\n${JSON.stringify(discovered, null, 2)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
