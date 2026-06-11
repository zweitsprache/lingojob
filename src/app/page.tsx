"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

type StructuredSummary = Record<string, unknown>;

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return "n/a";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "n/a";
    }

    const hasObjectItems = value.some((item) => item && typeof item === "object");
    if (!hasObjectItems) {
      return (
        <ul className="list-disc space-y-1 pl-5">
          {value.map((item, idx) => (
            <li key={`${String(item)}-${idx}`}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-2">
            {item && typeof item === "object" ? (
              <div className="grid gap-1 text-xs sm:grid-cols-2">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                  <div key={`${k}-${idx}`}>
                    <span className="font-medium text-slate-600">{prettifyKey(k)}:</span>{" "}
                    <span className="text-slate-700">{String(v ?? "n/a")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span>{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-1 text-xs">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium text-slate-600">{prettifyKey(k)}:</span>{" "}
            <span className="text-slate-700">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return "n/a";
}

export default function Home() {
  const [showSummaryForm, setShowSummaryForm] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [structuredSummaryDe, setStructuredSummaryDe] = useState<StructuredSummary | null>(null);
  const [structuredSummaryMt, setStructuredSummaryMt] = useState<StructuredSummary | null>(null);
  const [mtLanguageUsed, setMtLanguageUsed] = useState("en");
  const [resultCardType, setResultCardType] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [selectedCardType, setSelectedCardType] = useState("Stellenanzeige");
  const [selectedMotherTongue, setSelectedMotherTongue] = useState("en");

  const filterOptions = [
    "Stellenanzeige",
    "Vorstellungsgespraech",
    "Bewerbungsbrief",
    "Arbeitgeber",
  ];

  const cards = [
    { title: "Stellenanzeige", value: "Zusammenfassung", type: "Stellenanzeige" },
    { title: "Vorstellungsgespraech", value: "112", type: "Vorstellungsgespraech" },
    { title: "Bewerbungsbrief", value: "9", type: "Bewerbungsbrief" },
    { title: "Arbeitgeber", value: "4", type: "Arbeitgeber" },
  ];

  const filteredCards = cards.filter((card) => {
    const matchesFilter = activeFilter === "Alle" || card.type === activeFilter;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      card.title.toLowerCase().includes(normalizedSearch) ||
      card.value.toLowerCase().includes(normalizedSearch);

    return matchesFilter && matchesSearch;
  });

  const submitSummary = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!summaryText.trim()) {
      setSummaryError("Please enter text before submitting.");
      return;
    }

    setSummaryError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/claude-haiku", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: summaryText,
          cardType: selectedCardType,
          motherTongue: selectedMotherTongue,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        result?: string;
        structuredSummary?: StructuredSummary;
        structuredSummaryDe?: StructuredSummary;
        structuredSummaryMt?: StructuredSummary;
        mtLanguageUsed?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary.");
      }

      setStructuredSummaryDe(data.structuredSummaryDe || data.structuredSummary || null);
      setStructuredSummaryMt(data.structuredSummaryMt || data.structuredSummary || null);
      setMtLanguageUsed(data.mtLanguageUsed || selectedMotherTongue || "en");
      setSummaryResult(data.result || "No response returned.");
      setResultCardType(selectedCardType);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSummaryError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <h1 className="text-lg font-semibold">LingoJob Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              aria-label="Deutschkenntnisse"
              className="h-10 appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-slate-500"
              defaultValue=""
            >
              <option disabled value="">
                Deutschkenntnisse
              </option>
              <option value="a1-1">A1.1</option>
              <option value="a1-2">A1.2</option>
              <option value="a2-1">A2.1</option>
              <option value="a2-2">A2.2</option>
              <option value="b1-1">B1.1</option>
              <option value="b1-2">B1.2</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>

          <div className="relative">
            <select
              aria-label="Muttersprache"
              className="h-10 appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-slate-500"
              onChange={(event) => setSelectedMotherTongue(event.target.value)}
              value={selectedMotherTongue}
            >
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
              <option value="es">Spanisch</option>
              <option value="fr">Franzosisch</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
          <nav className="space-y-1 text-sm">
            <a className="block rounded-md bg-slate-900 px-3 py-2 font-medium text-white" href="#">
              Overview
            </a>
            <a className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100" href="#">
              Candidates
            </a>
            <a className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100" href="#">
              Openings
            </a>
            <a className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100" href="#">
              Reports
            </a>
            <a className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100" href="#">
              Settings
            </a>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Overview</h2>
          </div>

          <section className="mb-6 space-y-3">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search..."
              type="search"
              value={searchTerm}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setActiveFilter("Alle")}
                type="button"
                variant={activeFilter === "Alle" ? "default" : "outline"}
              >
                Alle
              </Button>
              {filterOptions.map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  type="button"
                  variant={activeFilter === filter ? "default" : "outline"}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </section>

          {summaryResult ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">AI Ergebnis: {resultCardType}</h3>
                <Button
                  onClick={() => {
                    setSummaryResult("");
                    setStructuredSummaryDe(null);
                    setStructuredSummaryMt(null);
                    setResultCardType("");
                  }}
                  type="button"
                  variant="outline"
                >
                  Zuruck zur Ubersicht
                </Button>
              </div>

              {structuredSummaryDe ? (
                <div className="space-y-4">
                  {Object.entries(structuredSummaryDe).map(([sectionKey, sectionValueDe]) => {
                    const mtSection =
                      structuredSummaryMt &&
                      typeof structuredSummaryMt === "object" &&
                      sectionKey in structuredSummaryMt
                        ? (structuredSummaryMt[sectionKey] as unknown)
                        : sectionValueDe;

                    return (
                      <article key={sectionKey} className="rounded-lg border border-slate-200 bg-white">
                      <header className="border-b border-slate-200 bg-slate-100 px-4 py-2">
                        <h4 className="text-sm font-semibold text-slate-800">{prettifyKey(sectionKey)}</h4>
                      </header>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-left">
                              <th className="w-48 border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                                Feld (DE)
                              </th>
                              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                                Deutsch
                              </th>
                              <th className="w-48 border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                                Feld ({mtLanguageUsed.toUpperCase()})
                              </th>
                              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                                {mtLanguageUsed.toUpperCase() === "EN"
                                  ? "Englisch"
                                  : `Muttersprache (${mtLanguageUsed.toUpperCase()})`}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionValueDe &&
                            typeof sectionValueDe === "object" &&
                            !Array.isArray(sectionValueDe) ? (
                              Array.from(
                                new Set([
                                  ...Object.keys(sectionValueDe as Record<string, unknown>),
                                  ...(mtSection &&
                                  typeof mtSection === "object" &&
                                  !Array.isArray(mtSection)
                                    ? Object.keys(mtSection as Record<string, unknown>)
                                    : []),
                                ])
                              ).map((fieldKey) => {
                                const deValue = (sectionValueDe as Record<string, unknown>)[fieldKey];
                                const mtValue =
                                  mtSection &&
                                  typeof mtSection === "object" &&
                                  !Array.isArray(mtSection)
                                    ? (mtSection as Record<string, unknown>)[fieldKey]
                                    : deValue;

                                return (
                                  <tr key={fieldKey} className="align-top odd:bg-white even:bg-slate-50">
                                    <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                                      {prettifyKey(fieldKey)}
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                                      {renderValue(deValue)}
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                                      {prettifyKey(fieldKey)}
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                                      {renderValue(mtValue)}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr className="align-top">
                                <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                                  Wert
                                </td>
                                <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                                  {renderValue(sectionValueDe)}
                                </td>
                                <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                                  Wert
                                </td>
                                <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                                  {renderValue(mtSection)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                    );
                  })}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{summaryResult}</p>
              )}
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((card) => {
                return (
                  <article
                    key={card.title}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-medium uppercase">{card.title}</p>
                    <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => {
                        setSelectedCardType(card.type);
                        setShowSummaryForm(true);
                      }}
                      type="button"
                    >
                      <Play className="size-4 fill-current" strokeWidth={0} />
                    </Button>
                  </article>
                );
              })}
            </section>
          )}
        </main>

        <aside className="w-full border-l border-slate-200 bg-white p-4 sm:w-96">
          {showSummaryForm ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">{selectedCardType}</h3>
                <Button onClick={() => setShowSummaryForm(false)} type="button" variant="outline">
                  Close
                </Button>
              </div>
              <form className="space-y-3" onSubmit={submitSummary}>
                <textarea
                  className="min-h-36 w-full rounded-md border border-slate-300 p-2 text-sm outline-none ring-0 focus:border-slate-500"
                  onChange={(event) => setSummaryText(event.target.value)}
                  placeholder={`Write your prompt for ${selectedCardType}...`}
                  value={summaryText}
                />
                {summaryError && <p className="text-sm text-red-600">{summaryError}</p>}
                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Generating..." : "Submit"}
                </Button>
              </form>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Select any card action to open the form here.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
