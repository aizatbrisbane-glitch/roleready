export type CountryInfo = {
  adzunaCode: string | null; // null = Adzuna doesn't cover this country
  joobleCountry: string;     // sent as Jooble location param
  geoTerms: string[];        // used to filter Jooble results to this country
};

export const AU_COUNTRY: CountryInfo = {
  adzunaCode: "au",
  joobleCountry: "Australia",
  geoTerms: ["australia", "nsw", "vic", "qld", "wa", "sa", "act", "tas", "nt", "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "hobart", "darwin"],
};

export const COUNTRY_RULES: { pattern: RegExp; info: CountryInfo }[] = [
  {
    pattern: /\b(uk|united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|glasgow|edinburgh|bristol|liverpool|sheffield|coventry|leicester|cardiff)\b/i,
    info: { adzunaCode: "gb", joobleCountry: "United Kingdom", geoTerms: ["uk", "united kingdom", "england", "scotland", "wales", "london", "manchester", "birmingham", "leeds", "glasgow", "bristol"] },
  },
  {
    pattern: /\b(usa?|united states|america|new york|los angeles|chicago|houston|phoenix|philadelphia|san francisco|seattle|boston|miami|denver|atlanta|dallas|austin|portland|san diego)\b/i,
    info: { adzunaCode: "us", joobleCountry: "United States", geoTerms: ["united states", "usa", "new york", "los angeles", "chicago", "houston", "san francisco", "seattle", "boston", "miami", "dallas"] },
  },
  {
    pattern: /\b(canada|toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg)\b/i,
    info: { adzunaCode: "ca", joobleCountry: "Canada", geoTerms: ["canada", "toronto", "vancouver", "montreal", "calgary", "ottawa", "edmonton"] },
  },
  {
    pattern: /\b(malaysia|kuala lumpur|\bkl\b|penang|johor|petaling jaya|\bpj\b|subang|klang|ipoh|kota kinabalu|kuching|cyberjaya|putrajaya)\b/i,
    info: { adzunaCode: null, joobleCountry: "Malaysia", geoTerms: ["malaysia", "kuala lumpur", "penang", "johor", "petaling", "subang", "klang", "ipoh", "cyberjaya", "putrajaya"] },
  },
  {
    pattern: /\b(singapore)\b/i,
    info: { adzunaCode: "sg", joobleCountry: "Singapore", geoTerms: ["singapore"] },
  },
  {
    pattern: /\b(indonesia|jakarta|surabaya|bandung|bali|medan|yogyakarta|semarang|bekasi|tangerang)\b/i,
    info: { adzunaCode: null, joobleCountry: "Indonesia", geoTerms: ["indonesia", "jakarta", "surabaya", "bandung", "bali", "yogyakarta"] },
  },
  {
    pattern: /\b(philippines|manila|quezon city|cebu|davao|makati|taguig|pasig|antipolo|cagayan)\b/i,
    info: { adzunaCode: null, joobleCountry: "Philippines", geoTerms: ["philippines", "manila", "cebu", "davao", "makati"] },
  },
  {
    pattern: /\b(new zealand|\bnz\b|auckland|wellington|christchurch|hamilton|tauranga|dunedin)\b/i,
    info: { adzunaCode: "nz", joobleCountry: "New Zealand", geoTerms: ["new zealand", "auckland", "wellington", "christchurch", "hamilton", "dunedin"] },
  },
  {
    pattern: /\b(india|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|kolkata|noida|gurugram|gurgaon)\b/i,
    info: { adzunaCode: "in", joobleCountry: "India", geoTerms: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "chennai", "pune", "kolkata"] },
  },
  {
    pattern: /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne|düsseldorf|stuttgart)\b/i,
    info: { adzunaCode: "de", joobleCountry: "Germany", geoTerms: ["germany", "deutschland", "berlin", "munich", "hamburg", "frankfurt", "cologne"] },
  },
  {
    pattern: /\b(france|paris|lyon|marseille|toulouse|nice|nantes|bordeaux|strasbourg)\b/i,
    info: { adzunaCode: "fr", joobleCountry: "France", geoTerms: ["france", "paris", "lyon", "marseille", "toulouse"] },
  },
  {
    pattern: /\b(netherlands|holland|amsterdam|rotterdam|the hague|den haag|utrecht|eindhoven)\b/i,
    info: { adzunaCode: "nl", joobleCountry: "Netherlands", geoTerms: ["netherlands", "holland", "amsterdam", "rotterdam", "utrecht"] },
  },
  {
    pattern: /\b(south africa|johannesburg|cape town|durban|pretoria|port elizabeth|bloemfontein)\b/i,
    info: { adzunaCode: "za", joobleCountry: "South Africa", geoTerms: ["south africa", "johannesburg", "cape town", "durban", "pretoria"] },
  },
];

export function inferCountry(locations: string[]): CountryInfo {
  const combined = locations.filter(Boolean).join(" ");
  if (!combined.trim()) return AU_COUNTRY;
  for (const { pattern, info } of COUNTRY_RULES) {
    if (pattern.test(combined)) return info;
  }
  return AU_COUNTRY;
}

export function isCountryLocation(loc: string, countryInfo: CountryInfo): boolean {
  const l = loc.toLowerCase();
  return countryInfo.geoTerms.some((t) => l.includes(t));
}

export function marketLabel(info: CountryInfo): string {
  if (info.adzunaCode) return `Adzuna ${info.joobleCountry} + Jooble`;
  return `Jooble`;
}

export function currencySymbol(info: CountryInfo): string {
  switch (info.joobleCountry) {
    case "United Kingdom": return "£";
    case "Germany": case "France": case "Netherlands": return "€";
    case "India": return "₹";
    case "South Africa": return "R";
    case "Malaysia": return "RM";
    case "Indonesia": return "Rp";
    case "Philippines": return "₱";
    default: return "$";
  }
}

export function boardsHint(info: CountryInfo): { boards: string; note: string } {
  const c = info.adzunaCode;
  if (c === "gb") return { boards: "Reed, Totaljobs and LinkedIn", note: "For search pages, open the job in a new tab first." };
  if (c === "au" || c === "nz") return { boards: "SEEK and LinkedIn", note: "For Indeed, Jora or government portals, paste the job description." };
  if (c === "us" || c === "ca") return { boards: "LinkedIn", note: "For Indeed, paste the job description." };
  if (["Malaysia", "Singapore", "Indonesia", "Philippines"].includes(info.joobleCountry)) {
    return { boards: "JobStreet and LinkedIn", note: "For search pages, open the job in a new tab first." };
  }
  return { boards: "LinkedIn", note: "For search pages, open the job in a new tab first." };
}
