import { NextResponse } from "next/server";

type ClaudeRequestBody = {
  prompt?: string;
  cardType?: string;
  motherTongue?: string;
};

type AnyRecord = Record<string, unknown>;

const SYSTEM_PROMPT =
  "You are a precise information extraction system for job postings. Return a single valid JSON object only.";

const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.ANTHROPIC_MODEL,
      "claude-haiku-4-5-20251001",
      "claude-haiku-4-5",
      "claude-3-5-haiku-latest",
      "claude-3-haiku-20240307",
    ].filter((v): v is string => Boolean(v && v.trim()))
  )
);

const STRUCTURED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "meta",
    "unternehmen",
    "stelle",
    "arbeitsort",
    "anforderungen",
    "aufgaben",
    "angebot",
    "kontakt",
    "rohtext",
  ],
  properties: {
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["anzeige_id", "quelle", "publikationsdatum", "bewerbungsfrist", "sprache"],
      properties: {
        anzeige_id: { type: "string" },
        quelle: { type: "string" },
        publikationsdatum: { type: "string" },
        bewerbungsfrist: { type: "string" },
        sprache: { type: "string" },
      },
    },
    unternehmen: {
      type: "object",
      additionalProperties: false,
      required: ["name", "branche", "grösse", "website", "beschreibung"],
      properties: {
        name: { type: "string" },
        branche: { type: "string" },
        "grösse": { type: "string" },
        website: { type: "string" },
        beschreibung: { type: "string" },
      },
    },
    stelle: {
      type: "object",
      additionalProperties: false,
      required: [
        "titel",
        "titel_normalisiert",
        "funktion",
        "seniorität",
        "pensum_min",
        "pensum_max",
        "vertragsart",
        "stellenantritt",
      ],
      properties: {
        titel: { type: "string" },
        titel_normalisiert: { type: "string" },
        funktion: { type: "string" },
        "seniorität": { type: "string" },
        pensum_min: { type: "string" },
        pensum_max: { type: "string" },
        vertragsart: { type: "string" },
        stellenantritt: { type: "string" },
      },
    },
    arbeitsort: {
      type: "object",
      additionalProperties: false,
      required: ["ort", "kanton_region", "land", "homeoffice", "homeoffice_details"],
      properties: {
        ort: { type: "string" },
        kanton_region: { type: "string" },
        land: { type: "string" },
        homeoffice: { type: "string" },
        homeoffice_details: { type: "string" },
      },
    },
    anforderungen: {
      type: "object",
      additionalProperties: false,
      required: [
        "ausbildung",
        "berufserfahrung_jahre",
        "hard_skills",
        "soft_skills",
        "sprachen",
        "zertifikate",
        "muss_kriterien",
        "kann_kriterien",
      ],
      properties: {
        ausbildung: { type: "array", items: { type: "string" } },
        berufserfahrung_jahre: { type: "string" },
        hard_skills: { type: "array", items: { type: "string" } },
        soft_skills: { type: "array", items: { type: "string" } },
        sprachen: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sprache", "niveau"],
            properties: {
              sprache: { type: "string" },
              niveau: { type: "string" },
            },
          },
        },
        zertifikate: { type: "array", items: { type: "string" } },
        muss_kriterien: { type: "array", items: { type: "string" } },
        kann_kriterien: { type: "array", items: { type: "string" } },
      },
    },
    aufgaben: { type: "array", items: { type: "string" } },
    angebot: {
      type: "object",
      additionalProperties: false,
      required: ["lohn_min", "lohn_max", "lohn_währung", "lohn_periode", "benefits"],
      properties: {
        lohn_min: { type: "string" },
        lohn_max: { type: "string" },
        "lohn_währung": { type: "string" },
        lohn_periode: { type: "string" },
        benefits: { type: "array", items: { type: "string" } },
      },
    },
    kontakt: {
      type: "object",
      additionalProperties: false,
      required: ["ansprechperson", "email", "telefon", "bewerbungsweg"],
      properties: {
        ansprechperson: { type: "string" },
        email: { type: "string" },
        telefon: { type: "string" },
        bewerbungsweg: { type: "string" },
      },
    },
    rohtext: { type: "string" },
  },
};

function emptySummary(language: string, prompt: string): AnyRecord {
  return {
    meta: {
      anzeige_id: "n/a",
      quelle: "n/a",
      publikationsdatum: "n/a",
      bewerbungsfrist: "n/a",
      sprache: language,
    },
    unternehmen: {
      name: "n/a",
      branche: "n/a",
      "grösse": "n/a",
      website: "n/a",
      beschreibung: "n/a",
    },
    stelle: {
      titel: "n/a",
      titel_normalisiert: "n/a",
      funktion: "n/a",
      "seniorität": "n/a",
      pensum_min: "n/a",
      pensum_max: "n/a",
      vertragsart: "n/a",
      stellenantritt: "n/a",
    },
    arbeitsort: {
      ort: "n/a",
      kanton_region: "n/a",
      land: "n/a",
      homeoffice: "n/a",
      homeoffice_details: "n/a",
    },
    anforderungen: {
      ausbildung: ["n/a"],
      berufserfahrung_jahre: "n/a",
      hard_skills: ["n/a"],
      soft_skills: ["n/a"],
      sprachen: [{ sprache: "n/a", niveau: "n/a" }],
      zertifikate: ["n/a"],
      muss_kriterien: ["n/a"],
      kann_kriterien: ["n/a"],
    },
    aufgaben: ["n/a"],
    angebot: {
      lohn_min: "n/a",
      lohn_max: "n/a",
      "lohn_währung": "n/a",
      lohn_periode: "n/a",
      benefits: ["n/a"],
    },
    kontakt: {
      ansprechperson: "n/a",
      email: "n/a",
      telefon: "n/a",
      bewerbungsweg: "n/a",
    },
    rohtext: prompt,
  };
}

function extractText(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as AnyRecord;

  if (Array.isArray(record.content)) {
    const textParts = record.content
      .map((item) => {
        if (!item || typeof item !== "object") {
          return "";
        }

        const block = item as AnyRecord;
        if (block.type === "text" && typeof block.text === "string") {
          return block.text;
        }

        return "";
      })
      .filter(Boolean);

    if (textParts.length > 0) {
      return textParts.join("\n\n").trim();
    }
  }

  return null;
}

function parseStructuredPayload(data: unknown): AnyRecord | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as AnyRecord;

  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const block = item as AnyRecord;
      if ((block.type === "json" || block.type === "output_json") && block.json) {
        if (typeof block.json === "object" && !Array.isArray(block.json)) {
          return block.json as AnyRecord;
        }
      }
    }
  }

  const text = extractText(data);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as AnyRecord;
    }
  } catch {
    const stripped = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(stripped) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AnyRecord;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function normalizeScalar(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "n/a";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "n/a";
}

function normalizeArray(value: unknown, objectTemplate?: AnyRecord): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    if (objectTemplate) {
      return [{ ...objectTemplate }];
    }
    return ["n/a"];
  }

  if (objectTemplate) {
    return value.map((item) => {
      if (!item || typeof item !== "object") {
        return { ...objectTemplate };
      }
      const src = item as AnyRecord;
      const out: AnyRecord = {};
      for (const key of Object.keys(objectTemplate)) {
        out[key] = normalizeScalar(src[key]);
      }
      return out;
    });
  }

  return value.map((item) => normalizeScalar(item));
}

function hasStructuredKeys(value: unknown): value is AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as AnyRecord;
  return ["meta", "unternehmen", "stelle", "arbeitsort", "anforderungen", "angebot", "kontakt", "rohtext"].some(
    (key) => key in record
  );
}

function unwrapStructuredInput(input: AnyRecord): AnyRecord {
  if (hasStructuredKeys(input)) {
    return input;
  }

  const candidates = ["structuredSummary", "summary", "data", "output", "json"];
  for (const key of candidates) {
    const nested = input[key];
    if (hasStructuredKeys(nested)) {
      return nested as AnyRecord;
    }

    if (typeof nested === "string") {
      try {
        const parsed = JSON.parse(nested) as unknown;
        if (hasStructuredKeys(parsed)) {
          return parsed as AnyRecord;
        }
      } catch {
        // ignore
      }
    }
  }

  for (const value of Object.values(input)) {
    if (hasStructuredKeys(value)) {
      return value as AnyRecord;
    }
  }

  return input;
}

function normalizeStructuredSummary(input: AnyRecord, language: string, prompt: string): AnyRecord {
  const safeInput = unwrapStructuredInput(input);
  const out = emptySummary(language, prompt);

  const srcMeta = safeInput.meta as AnyRecord | undefined;
  const srcCompany = safeInput.unternehmen as AnyRecord | undefined;
  const srcJob = safeInput.stelle as AnyRecord | undefined;
  const srcPlace = safeInput.arbeitsort as AnyRecord | undefined;
  const srcReq = safeInput.anforderungen as AnyRecord | undefined;
  const srcOffer = safeInput.angebot as AnyRecord | undefined;
  const srcContact = safeInput.kontakt as AnyRecord | undefined;

  const meta = out.meta as AnyRecord;
  meta.anzeige_id = normalizeScalar(srcMeta?.anzeige_id);
  meta.quelle = normalizeScalar(srcMeta?.quelle);
  meta.publikationsdatum = normalizeScalar(srcMeta?.publikationsdatum);
  meta.bewerbungsfrist = normalizeScalar(srcMeta?.bewerbungsfrist);
  meta.sprache = normalizeScalar(srcMeta?.sprache || language);

  const company = out.unternehmen as AnyRecord;
  company.name = normalizeScalar(srcCompany?.name);
  company.branche = normalizeScalar(srcCompany?.branche);
  company["grösse"] = normalizeScalar(srcCompany?.["grösse"]);
  company.website = normalizeScalar(srcCompany?.website);
  company.beschreibung = normalizeScalar(srcCompany?.beschreibung);

  const job = out.stelle as AnyRecord;
  job.titel = normalizeScalar(srcJob?.titel);
  job.titel_normalisiert = normalizeScalar(srcJob?.titel_normalisiert);
  job.funktion = normalizeScalar(srcJob?.funktion);
  job["seniorität"] = normalizeScalar(srcJob?.["seniorität"]);
  job.pensum_min = normalizeScalar(srcJob?.pensum_min);
  job.pensum_max = normalizeScalar(srcJob?.pensum_max);
  job.vertragsart = normalizeScalar(srcJob?.vertragsart);
  job.stellenantritt = normalizeScalar(srcJob?.stellenantritt);

  const place = out.arbeitsort as AnyRecord;
  place.ort = normalizeScalar(srcPlace?.ort);
  place.kanton_region = normalizeScalar(srcPlace?.kanton_region);
  place.land = normalizeScalar(srcPlace?.land);
  place.homeoffice = normalizeScalar(srcPlace?.homeoffice);
  place.homeoffice_details = normalizeScalar(srcPlace?.homeoffice_details);

  const req = out.anforderungen as AnyRecord;
  req.ausbildung = normalizeArray(srcReq?.ausbildung);
  req.berufserfahrung_jahre = normalizeScalar(srcReq?.berufserfahrung_jahre);
  req.hard_skills = normalizeArray(srcReq?.hard_skills);
  req.soft_skills = normalizeArray(srcReq?.soft_skills);
  req.sprachen = normalizeArray(srcReq?.sprachen, { sprache: "n/a", niveau: "n/a" } as AnyRecord);
  req.zertifikate = normalizeArray(srcReq?.zertifikate);
  req.muss_kriterien = normalizeArray(srcReq?.muss_kriterien);
  req.kann_kriterien = normalizeArray(srcReq?.kann_kriterien);

  out.aufgaben = normalizeArray(safeInput.aufgaben);

  const offer = out.angebot as AnyRecord;
  offer.lohn_min = normalizeScalar(srcOffer?.lohn_min);
  offer.lohn_max = normalizeScalar(srcOffer?.lohn_max);
  offer["lohn_währung"] = normalizeScalar(srcOffer?.["lohn_währung"]);
  offer.lohn_periode = normalizeScalar(srcOffer?.lohn_periode);
  offer.benefits = normalizeArray(srcOffer?.benefits);

  const contact = out.kontakt as AnyRecord;
  contact.ansprechperson = normalizeScalar(srcContact?.ansprechperson);
  contact.email = normalizeScalar(srcContact?.email);
  contact.telefon = normalizeScalar(srcContact?.telefon);
  contact.bewerbungsweg = normalizeScalar(srcContact?.bewerbungsweg);

  out.rohtext = normalizeScalar(safeInput.rohtext || prompt);

  return out;
}

function basicFallbackFromPrompt(prompt: string, language: string): AnyRecord {
  const out = emptySummary(language, prompt);
  const firstChunk = prompt.split(/[.\n]/).map((v) => v.trim()).find(Boolean) || "n/a";

  const title = firstChunk;
  const companyMatch = prompt.match(/(?:firma|unternehmen|arbeitgeber)\s*:\s*([^.,\n]+)/i);
  const locationMatch = prompt.match(/(?:ort|standort|location)\s*:\s*([^.,\n]+)/i);
  const applyMatch = prompt.match(/(?:bewerbungsweg|bewerbung)\s*:\s*([^.,\n]+)/i);

  (out.stelle as AnyRecord).titel = title;
  (out.stelle as AnyRecord).titel_normalisiert = title;

  if (companyMatch?.[1]) {
    (out.unternehmen as AnyRecord).name = companyMatch[1].trim();
  }

  if (locationMatch?.[1]) {
    (out.arbeitsort as AnyRecord).ort = locationMatch[1].trim();
  }

  if (applyMatch?.[1]) {
    (out.kontakt as AnyRecord).bewerbungsweg = applyMatch[1].trim();
  }

  return out;
}

function fillIfNA(target: AnyRecord, key: string, value: string): void {
  const current = typeof target[key] === "string" ? String(target[key]).trim().toLowerCase() : "";
  if (!current || current === "n/a") {
    target[key] = value;
  }
}

function setIfMissingOrWeak(target: AnyRecord, key: string, value: string, weakPatterns: RegExp[]): void {
  const current = typeof target[key] === "string" ? String(target[key]).trim() : "";
  const normalized = current.toLowerCase();
  const isWeak = !current || normalized === "n/a" || weakPatterns.some((rx) => rx.test(current));
  if (isWeak) {
    target[key] = value;
  }
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractBlock(text: string, startHeading: string, nextHeadings: string[]): string | null {
  const startIdx = text.toLowerCase().indexOf(startHeading.toLowerCase());
  if (startIdx < 0) {
    return null;
  }

  const afterStart = text.slice(startIdx + startHeading.length);
  const lowerAfter = afterStart.toLowerCase();
  let endIdx = afterStart.length;

  for (const heading of nextHeadings) {
    const idx = lowerAfter.indexOf(heading.toLowerCase());
    if (idx >= 0 && idx < endIdx) {
      endIdx = idx;
    }
  }

  const block = afterStart.slice(0, endIdx).trim();
  return block.length > 0 ? block : null;
}

function extractListItems(block: string, maxItems = 8): string[] {
  const collapsed = normalizeSpaces(block);
  const sentenceSplit = collapsed
    .split(/(?<=[.!?])\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 10);

  if (sentenceSplit.length >= 2) {
    return sentenceSplit.slice(0, maxItems);
  }

  const phraseSplit = collapsed
    .split(/\s(?=[A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöüßA-ZÄÖÜ*\/\-]+){2,})/)
    .map((v) => v.trim())
    .filter((v) => v.length > 10);

  return phraseSplit.slice(0, maxItems);
}

function guessTitleFromText(text: string, lines: string[]): string | null {
  const introMatch = text.match(/Einf[uü]hrung\s+([^\n]{4,120})/i);
  if (introMatch?.[1]) {
    const raw = normalizeSpaces(introMatch[1]);
    const cut = raw.split(/\s+mit\s+/i)[0]?.trim() || raw;
    if (cut.length > 3) {
      return cut;
    }
  }

  const rolePattern = /\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-/*]{2,}(?:\s+[A-Za-zÄÖÜäöüß\-/*]{2,}){0,3}(?:chef\*?in|leiter\*?in|manager\*?in|entwickler\*?in|engineer|koch\/k[oö]chin|koch|k[oö]chin|spezialist\*?in|berater\*?in|assistent\*?in))\b/i;
  const roleMatch = text.match(rolePattern);
  if (roleMatch?.[1]) {
    return normalizeSpaces(roleMatch[1]);
  }

  for (const line of lines) {
    const cleaned = normalizeSpaces(line);
    if (cleaned.length < 4) continue;
    if (/^vor\s+\d+\s+wochen/i.test(cleaned)) continue;
    if (/^(melde dich an|du passt sehr gut|passt dieser job)/i.test(cleaned)) continue;
    if (/\d{1,3}%/.test(cleaned) && cleaned.split(" ").length > 8) continue;
    return cleaned;
  }

  return null;
}

function enrichFromPrompt(summary: AnyRecord, prompt: string): AnyRecord {
  const text = prompt;
  const lower = text.toLowerCase();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const meta = (summary.meta as AnyRecord) || {};
  const company = (summary.unternehmen as AnyRecord) || {};
  const job = (summary.stelle as AnyRecord) || {};
  const location = (summary.arbeitsort as AnyRecord) || {};
  const req = (summary.anforderungen as AnyRecord) || {};
  const contact = (summary.kontakt as AnyRecord) || {};

  const guessedTitle = guessTitleFromText(text, lines) || lines[0] || "n/a";
  setIfMissingOrWeak(job, "titel", guessedTitle, [/^vor\s+\d+\s+wochen/i, /^n\/a$/i]);
  setIfMissingOrWeak(job, "titel_normalisiert", guessedTitle, [/^vor\s+\d+\s+wochen/i, /^n\/a$/i]);

  const explicitCompanyMatch = text.match(/(?:firma|unternehmen|arbeitgeber)\s*:\s*([^.,\n]+)/i);
  const inlineCompanyMatch = text.match(/(?:bei|from)\s+([A-Z][\w&\-. ]{2,})/);
  if (explicitCompanyMatch?.[1]) {
    fillIfNA(company, "name", explicitCompanyMatch[1].trim());
  } else if (inlineCompanyMatch?.[1]) {
    fillIfNA(company, "name", inlineCompanyMatch[1].trim());
  }

  const urlMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch?.[0]) {
    fillIfNA(meta, "quelle", urlMatch[0]);
    fillIfNA(company, "website", urlMatch[0]);
  }

  const bareWebsiteMatch = text.match(/\b(?:www\.)[a-z0-9.-]+\.[a-z]{2,}\b/i);
  if (bareWebsiteMatch?.[0]) {
    fillIfNA(company, "website", bareWebsiteMatch[0]);
    fillIfNA(meta, "quelle", bareWebsiteMatch[0]);
  }

  const isoDate = text.match(/(20\d{2}-\d{2}-\d{2})/);
  if (isoDate?.[1]) {
    fillIfNA(meta, "publikationsdatum", isoDate[1]);
  }

  const dateEu = text.match(/(\d{1,2}[./]\d{1,2}[./]\d{2,4})/);
  if (dateEu?.[1]) {
    fillIfNA(meta, "publikationsdatum", dateEu[1]);
  }

  const deadline = text.match(/(?:frist|bewerbungsfrist)\s*:?\s*(20\d{2}-\d{2}-\d{2})/i);
  if (deadline?.[1]) {
    fillIfNA(meta, "bewerbungsfrist", deadline[1]);
  }

  const deadlineEu = text.match(/(?:frist|bewerbungsfrist|bewerben bis)\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i);
  if (deadlineEu?.[1]) {
    fillIfNA(meta, "bewerbungsfrist", deadlineEu[1]);
  }

  const locationMatch = text.match(/(?:standort|ort|location)\s*:\s*([^.,\n]+)/i);
  if (locationMatch?.[1]) {
    fillIfNA(location, "ort", locationMatch[1].trim());
  }

  const postalCityMatch = text.match(/\b\d{4}\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+)/);
  if (postalCityMatch?.[1]) {
    setIfMissingOrWeak(location, "ort", postalCityMatch[1], [/^wirtschaft$/i, /^n\/a$/i]);
  }

  const cityMatch = text.match(/\b(?:in|at)\s+([A-Z][a-zA-ZäöüÄÖÜß\-]+(?:\s+[A-Z][a-zA-ZäöüÄÖÜß\-]+)?)\b/);
  if (cityMatch?.[1] && !/(dein|deine|their|your)/i.test(cityMatch[1])) {
    setIfMissingOrWeak(location, "ort", cityMatch[1], [/^wirtschaft$/i, /^n\/a$/i]);
  }

  if (lower.includes("remote") || lower.includes("homeoffice") || lower.includes("hybrid")) {
    fillIfNA(location, "homeoffice", "ja");
    if (String(location.homeoffice_details || "n/a").toLowerCase() === "n/a") {
      if (lower.includes("hybrid")) {
        location.homeoffice_details = "hybrid";
      } else if (lower.includes("remote")) {
        location.homeoffice_details = "remote";
      } else {
        location.homeoffice_details = "homeoffice möglich";
      }
    }
  }

  const applyMatch = text.match(/(?:bewerbungsweg|bewerbung)\s*:\s*([^.,\n]+)/i);
  if (applyMatch?.[1]) {
    fillIfNA(contact, "bewerbungsweg", applyMatch[1].trim());
  }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch?.[0]) {
    fillIfNA(contact, "email", emailMatch[0]);
    fillIfNA(contact, "bewerbungsweg", `E-Mail an ${emailMatch[0]}`);
  }

  const phoneMatch = text.match(/(?:\+\d{1,3}\s?)?(?:\d{2,3}[\s/-]?){3,5}\d{2}/);
  if (phoneMatch?.[0] && phoneMatch[0].replace(/\D/g, "").length >= 8) {
    fillIfNA(contact, "telefon", phoneMatch[0].trim());
  }

  const rangeMatch = text.match(/(\d{1,3})\s*[-/]\s*(\d{1,3})\s*%/);
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    fillIfNA(job, "pensum_min", `${rangeMatch[1]}%`);
    fillIfNA(job, "pensum_max", `${rangeMatch[2]}%`);
  }

  const exactPensum = text.match(/(\d{1,3})\s*%/);
  if (exactPensum?.[1]) {
    fillIfNA(job, "pensum_min", `${exactPensum[1]}%`);
    fillIfNA(job, "pensum_max", `${exactPensum[1]}%`);
  }

  const singlePensum = text.match(/(?:pensum|workload|teilzeit|part[- ]?time|vollzeit|full[- ]?time)\D{0,20}(\d{1,3})\s*%/i);
  if (singlePensum?.[1]) {
    fillIfNA(job, "pensum_min", `${singlePensum[1]}%`);
    fillIfNA(job, "pensum_max", `${singlePensum[1]}%`);
  } else if (lower.includes("vollzeit") || lower.includes("full-time") || lower.includes("full time")) {
    fillIfNA(job, "pensum_min", "100%");
    fillIfNA(job, "pensum_max", "100%");
  }

  if (lower.includes("befristet") || lower.includes("temporary")) {
    fillIfNA(job, "vertragsart", "Befristet");
  } else if (lower.includes("unbefristet") || lower.includes("permanent")) {
    fillIfNA(job, "vertragsart", "Unbefristet");
  } else if (lower.includes("festanstellung")) {
    fillIfNA(job, "vertragsart", "Festanstellung");
  } else if (lower.includes("praktikum") || lower.includes("internship")) {
    fillIfNA(job, "vertragsart", "Praktikum");
  }

  const germanDate = text.match(/\b(\d{1,2}\.?\s+[A-Za-zÄÖÜäöü]+\s+20\d{2})\b/);
  if (germanDate?.[1]) {
    fillIfNA(meta, "publikationsdatum", normalizeSpaces(germanDate[1]));
  }

  if (lower.includes("online-bewerbung") || lower.includes("online bewerbung") || lower.includes("direkt auf unserer website")) {
    fillIfNA(contact, "bewerbungsweg", "Online-Bewerbung auf Website");
  }

  const contactBlock = extractBlock(text, "Kontakt", ["Rohtext", "Interessiert", "Über uns"]);
  if (contactBlock) {
    const personMatch = contactBlock.match(/([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)/);
    if (personMatch?.[1]) {
      fillIfNA(contact, "ansprechperson", personMatch[1]);
    }
  }

  const experienceMatch = text.match(/(\d+)\+?\s*(?:jahre|years)\s+(?:erfahrung|experience)/i);
  if (experienceMatch?.[1]) {
    fillIfNA(req, "berufserfahrung_jahre", experienceMatch[1]);
  }

  if ((String(job["seniorität"] || "n/a").toLowerCase() === "n/a")) {
    if (lower.includes("praktikum")) job["seniorität"] = "Praktikum";
    else if (lower.includes("junior")) job["seniorität"] = "Junior";
    else if (lower.includes("senior")) job["seniorität"] = "Senior";
    else if (lower.includes("lead")) job["seniorität"] = "Lead";
    else if (lower.includes("manager") || lower.includes("management")) job["seniorität"] = "Management";
  }

  // Do not override model hard_skills - trust Claude's extraction for language-specific content

  // Do not override model sprachen - trust Claude's extraction for language-specific content

  // Do not override model aufgaben - trust Claude's extraction for language-specific content

  // Do not override model muss_kriterien - trust Claude's extraction for language-specific content

  const companyAboutMatch = text.match(/(?:[ÜU]ber uns\s+)(?:Die\s+)?([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\- ]{2,50}?)\s+bietet/i);
  if (companyAboutMatch?.[1]) {
    fillIfNA(company, "name", normalizeSpaces(companyAboutMatch[1]));
  }

  summary.meta = meta;
  summary.unternehmen = company;
  summary.stelle = job;
  summary.arbeitsort = location;
  summary.anforderungen = req;
  summary.kontakt = contact;

  return summary;
}

function scalarToNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "n/a") {
      return null;
    }
    return trimmed;
  }

  return String(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === "n/a") {
    return null;
  }

  const match = normalized.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => scalarToNull(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeSeniority(value: unknown): "Praktikum" | "Junior" | "Mid" | "Senior" | "Lead" | "Management" | null {
  const v = (scalarToNull(value) || "").toLowerCase();
  if (!v) return null;
  if (v.includes("prakt")) return "Praktikum";
  if (v.includes("junior")) return "Junior";
  if (v === "mid" || v.includes("mittel") || v.includes("intermediate")) return "Mid";
  if (v.includes("senior")) return "Senior";
  if (v.includes("lead")) return "Lead";
  if (v.includes("management") || v.includes("manager")) return "Management";
  return null;
}

function normalizeContract(value: unknown): "unbefristet" | "befristet" | "temporär" | "Freelance" | null {
  const v = (scalarToNull(value) || "").toLowerCase();
  if (!v) return null;
  if (v.includes("unbefristet") || v.includes("festanstellung") || v.includes("permanent")) return "unbefristet";
  if (v.includes("befristet")) return "befristet";
  if (v.includes("tempor") || v.includes("temp")) return "temporär";
  if (v.includes("freelance")) return "Freelance";
  return null;
}

function normalizeHomeoffice(value: unknown, details: unknown): "vor Ort" | "hybrid" | "remote" | null {
  const merged = `${scalarToNull(value) || ""} ${scalarToNull(details) || ""}`.toLowerCase();
  if (!merged.trim()) return null;
  if (merged.includes("hybrid")) return "hybrid";
  if (merged.includes("remote")) return "remote";
  if (merged.includes("vor ort") || merged.includes("on-site") || merged.includes("onsite")) return "vor Ort";
  return null;
}

function normalizeDate(value: unknown): string | null {
  const raw = scalarToNull(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const eu = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (eu) {
    const day = eu[1].padStart(2, "0");
    const month = eu[2].padStart(2, "0");
    const year = eu[3].length === 2 ? `20${eu[3]}` : eu[3];
    return `${year}-${month}-${day}`;
  }

  const deMonth = raw.match(/^(\d{1,2})\.?\s+([A-Za-zÄÖÜäöü]+)\s+(\d{4})$/);
  if (deMonth) {
    const months: Record<string, string> = {
      januar: "01",
      februar: "02",
      märz: "03",
      maerz: "03",
      april: "04",
      mai: "05",
      juni: "06",
      juli: "07",
      august: "08",
      september: "09",
      oktober: "10",
      november: "11",
      dezember: "12",
    };
    const month = months[deMonth[2].toLowerCase()];
    if (month) {
      return `${deMonth[3]}-${month}-${deMonth[1].padStart(2, "0")}`;
    }
  }

  return null;
}

function convertToStrictSchema(summary: AnyRecord, language: string, prompt: string): AnyRecord {
  const meta = (summary.meta as AnyRecord) || {};
  const company = (summary.unternehmen as AnyRecord) || {};
  const job = (summary.stelle as AnyRecord) || {};
  const place = (summary.arbeitsort as AnyRecord) || {};
  const req = (summary.anforderungen as AnyRecord) || {};
  const offer = (summary.angebot as AnyRecord) || {};
  const contact = (summary.kontakt as AnyRecord) || {};

  const languageNorm = (["de", "en", "fr", "it"].includes(language) ? language : "de") as "de" | "en" | "fr" | "it";
  const title = scalarToNull(job.titel) || scalarToNull(job.titel_normalisiert) || prompt.split(/[\n.]/)[0]?.trim() || "Unbekannte Stelle";

  return {
    meta: {
      publikationsdatum: normalizeDate(meta.publikationsdatum),
      bewerbungsfrist: normalizeDate(meta.bewerbungsfrist),
      sprache: languageNorm,
    },
    unternehmen: {
      name: scalarToNull(company.name),
      branche: scalarToNull(company.branche),
      "grösse": scalarToNull(company["grösse"]),
      website: scalarToNull(company.website),
      beschreibung: scalarToNull(company.beschreibung),
    },
    stelle: {
      titel: title,
      titel_normalisiert: scalarToNull(job.titel_normalisiert) || title,
      funktion: scalarToNull(job.funktion),
      "seniorität": normalizeSeniority(job["seniorität"]),
      pensum_min: toNumberOrNull(job.pensum_min),
      pensum_max: toNumberOrNull(job.pensum_max),
      vertragsart: normalizeContract(job.vertragsart),
      stellenantritt: scalarToNull(job.stellenantritt),
    },
    arbeitsort: {
      ort: scalarToNull(place.ort),
      kanton_region: scalarToNull(place.kanton_region),
      land: scalarToNull(place.land),
      homeoffice: normalizeHomeoffice(place.homeoffice, place.homeoffice_details),
      homeoffice_details: scalarToNull(place.homeoffice_details),
    },
    anforderungen: {
      ausbildung: toStringArray(req.ausbildung),
      berufserfahrung_jahre: toNumberOrNull(req.berufserfahrung_jahre),
      hard_skills: toStringArray(req.hard_skills),
      soft_skills: toStringArray(req.soft_skills),
      sprachen: Array.isArray(req.sprachen)
        ? (req.sprachen as unknown[])
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              const e = entry as AnyRecord;
              const lang = scalarToNull(e.sprache);
              if (!lang) return null;
              return { sprache: lang, niveau: scalarToNull(e.niveau) };
            })
            .filter((entry): entry is { sprache: string; niveau: string | null } => Boolean(entry))
        : [],
      zertifikate: toStringArray(req.zertifikate),
      muss_kriterien: toStringArray(req.muss_kriterien),
      kann_kriterien: toStringArray(req.kann_kriterien),
    },
    aufgaben: toStringArray(summary.aufgaben),
    angebot: {
      lohn_min: toNumberOrNull(offer.lohn_min),
      lohn_max: toNumberOrNull(offer.lohn_max),
      "lohn_währung": scalarToNull(offer["lohn_währung"]),
      lohn_periode: (["Jahr", "Monat", "Stunde"].includes(String(offer.lohn_periode || ""))
        ? (offer.lohn_periode as string)
        : null) as "Jahr" | "Monat" | "Stunde" | null,
      benefits: toStringArray(offer.benefits),
    },
    kontakt: {
      ansprechperson: scalarToNull(contact.ansprechperson),
      email: scalarToNull(contact.email),
      telefon: scalarToNull(contact.telefon),
      bewerbungsweg: scalarToNull(contact.bewerbungsweg),
    },
    rohtext: prompt,
  };
}

async function generateStructuredSummary(params: {
  apiKey: string;
  prompt: string;
  language: string;
}): Promise<{ summary: AnyRecord; modelUsed: string; error?: string }> {
  const { apiKey, prompt, language } = params;
  const freeTextRule =
    language === "de"
      ? "4. Keep the original language of the posting for free-text fields (tasks, benefits, skills). Do not translate."
      : `4. Translate free-text fields (tasks, benefits, skills) into ${language} while preserving meaning and specificity.`;

  const userPrompt = [
    "You are a precise information extraction system for job postings. Your task is to extract structured data from an unstructured job posting text and return it as a single valid JSON object.",
    "",
    "## Rules",
    "",
    "1. Return ONLY the JSON object. No preamble, no explanation, no markdown code fences.",
    "2. Extract as many values as possible, but NEVER invent or guess information that is not in the text.",
    "3. If a value is not present or cannot be reliably inferred, use null (for single values) or [] (for arrays).",
    freeTextRule,
    "5. Normalize where the schema requires it (dates to YYYY-MM-DD, percentages as numbers, enums to the allowed values).",
    "6. Salary: only extract if explicitly stated. Convert 13. Monatslohn or similar into benefits, not into salary fields. If a single salary value is given, set lohn_min = lohn_max.",
    "7. Workload: 80-100% -> pensum_min: 80, pensum_max: 100. Vollzeit -> 100/100. Teilzeit without numbers -> null/null.",
    "8. Distinguish muss_kriterien (required: zwingend, vorausgesetzt, must have, erforderlich) from kann_kriterien (optional: von Vorteil, wünschenswert, nice to have, idealerweise). If unmarked, treat as muss_kriterien.",
    "9. Language levels: map to CEFR (A1-C2) or Muttersprache where possible (fliessend -> C1, gute Kenntnisse -> B2, Grundkenntnisse -> A2). If unclear, use null for niveau.",
    "10. Split tasks and requirements into atomic items: one statement per array entry, no bullet characters.",
    "11. seniorität: infer from title and required experience if not explicit (0-2 years -> Junior, 3-5 -> Mid, 5+ -> Senior, leadership responsibility -> Lead or Management).",
    "12. homeoffice: vor Ort if no remote option is mentioned, hybrid if partial, remote if fully remote.",
    "13. Do not include the rohtext field in your output (it will be added programmatically).",
    `14. Set meta.sprache to \"${language}\".`,
    "",
    "## Output Schema",
    "{",
    '  "meta": {',
    '    "publikationsdatum": "YYYY-MM-DD | null",',
    '    "bewerbungsfrist": "YYYY-MM-DD | null",',
    '    "sprache": "de | en | fr | it"',
    "  },",
    '  "unternehmen": {',
    '    "name": "string | null",',
    '    "branche": "string | null",',
    '    "grösse": "string | null",',
    '    "website": "string | null",',
    '    "beschreibung": "string | null"',
    "  },",
    '  "stelle": {',
    '    "titel": "string",',
    '    "titel_normalisiert": "string",',
    '    "funktion": "string | null",',
    '    "seniorität": "Praktikum | Junior | Mid | Senior | Lead | Management | null",',
    '    "pensum_min": "number | null",',
    '    "pensum_max": "number | null",',
    '    "vertragsart": "unbefristet | befristet | temporär | Freelance | null",',
    '    "stellenantritt": "string | null"',
    "  },",
    '  "arbeitsort": {',
    '    "ort": "string | null",',
    '    "kanton_region": "string | null",',
    '    "land": "string | null",',
    '    "homeoffice": "vor Ort | hybrid | remote | null",',
    '    "homeoffice_details": "string | null"',
    "  },",
    '  "anforderungen": {',
    '    "ausbildung": [],',
    '    "berufserfahrung_jahre": "number | null",',
    '    "hard_skills": [],',
    '    "soft_skills": [],',
    '    "sprachen": [{ "sprache": "string", "niveau": "string | null" }],',
    '    "zertifikate": [],',
    '    "muss_kriterien": [],',
    '    "kann_kriterien": []',
    "  },",
    '  "aufgaben": [],',
    '  "angebot": {',
    '    "lohn_min": "number | null",',
    '    "lohn_max": "number | null",',
    '    "lohn_währung": "string | null",',
    '    "lohn_periode": "Jahr | Monat | Stunde | null",',
    '    "benefits": []',
    "  },",
    '  "kontakt": {',
    '    "ansprechperson": "string | null",',
    '    "email": "string | null",',
    '    "telefon": "string | null",',
    '    "bewerbungsweg": "string | null"',
    "  }",
    "}",
    "",
    "## Job Posting",
    "",
    prompt,
  ].join("\n");

  let lastError = "Anthropic request failed.";

  for (const model of MODEL_CANDIDATES) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = (await response.json()) as AnyRecord;

    if (response.ok) {
      const parsed = parseStructuredPayload(data);

      if (!parsed) {
        const fallback = convertToStrictSchema(basicFallbackFromPrompt(prompt, language), language, prompt);
        return {
          summary: fallback,
          modelUsed: `${model}:fallback-parse`,
          error: "Could not parse model payload; used fallback extraction.",
        };
      }

      const strict = convertToStrictSchema(parsed, language, prompt);

      return {
        summary: strict,
        modelUsed: model,
      };
    }

    const errorMessage =
      typeof (data.error as AnyRecord | undefined)?.message === "string"
        ? ((data.error as AnyRecord).message as string)
        : `Anthropic request failed for model ${model}.`;

    lastError = errorMessage;
    if (!errorMessage.toLowerCase().includes("model") && !errorMessage.toLowerCase().includes("schema")) {
      break;
    }
  }

  return {
    summary: convertToStrictSchema(basicFallbackFromPrompt(prompt, language), language, prompt),
    modelUsed: "fallback",
    error: `${lastError} Falling back to local extraction.`,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY environment variable." }, { status: 500 });
  }

  let body: ClaudeRequestBody;

  try {
    body = (await request.json()) as ClaudeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const cardType = body.cardType?.trim() || "Stellenanzeige";
  const motherTongue = (body.motherTongue || "en").toLowerCase();
  const mtLanguage = ["de", "en", "fr", "it", "es"].includes(motherTongue) ? motherTongue : "en";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (cardType !== "Stellenanzeige") {
    return NextResponse.json({ result: "n/a", modelUsed: "n/a" });
  }

  try {
    const de = await generateStructuredSummary({ apiKey, prompt, language: "de" });
    const mt = mtLanguage === "de"
      ? { summary: de.summary, modelUsed: `${de.modelUsed}:same-as-de` }
      : await generateStructuredSummary({ apiKey, prompt, language: mtLanguage });

    return NextResponse.json(
      {
        result: JSON.stringify(de.summary),
        structuredSummary: de.summary,
        structuredSummaryDe: de.summary,
        structuredSummaryMt: mt.summary,
        mtLanguageUsed: mtLanguage,
        modelUsed: `${de.modelUsed} | ${mt.modelUsed}`,
        error: de.error || mt.error,
      },
      { status: 200 }
    );
  } catch {
    const fallbackDe = convertToStrictSchema(basicFallbackFromPrompt(prompt, "de"), "de", prompt);
    const fallbackMt = convertToStrictSchema(basicFallbackFromPrompt(prompt, mtLanguage), mtLanguage, prompt);

    return NextResponse.json(
      {
        error: "Failed to reach Anthropic API. Falling back to local extraction.",
        result: JSON.stringify(fallbackDe),
        structuredSummary: fallbackDe,
        structuredSummaryDe: fallbackDe,
        structuredSummaryMt: fallbackMt,
        mtLanguageUsed: mtLanguage,
        modelUsed: "fallback",
      },
      { status: 200 }
    );
  }
}
