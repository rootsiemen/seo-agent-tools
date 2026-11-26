"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeoCheck, SeoToolId, SeoToolResult } from "@/lib/seo-tools";
import { btnPrimary } from "@/components/ui";

export type SeoToolMode = "single" | "dual" | "brief";

function tone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-green-600", bar: "bg-green-500" };
  if (score >= 50) return { text: "text-amber-500", bar: "bg-amber-400" };
  return { text: "text-red-500", bar: "bg-red-500" };
}

function CheckRow({ c }: { c: SeoCheck }) {
  const icon = c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗";
  const cls =
    c.status === "pass" ? "text-green-600" : c.status === "warn" ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex gap-3 py-3 border-b border-stone-100 last:border-0">
      <div className={`font-bold w-5 flex-none text-center ${cls}`}>{icon}</div>
      <div>
        <span className="font-semibold text-stone-900">{c.label}</span>{" "}
        <span className="text-stone-500 text-sm">— {c.detail}</span>
      </div>
    </div>
  );
}

const inputCls =
  "flex-1 rounded-full border border-stone-300 bg-white px-6 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export default function SeoToolRunner({
  tool,
  toolName,
  mode = "single",
  initialUrl = "",
}: {
  tool: SeoToolId;
  toolName: string;
  mode?: SeoToolMode;
  initialUrl?: string;
}) {
  const [input, setInput] = useState(initialUrl);
  const [input2, setInput2] = useState("");
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<SeoToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedLabel, setCheckedLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (params: { url?: string; url2?: string; keyword?: string }, label: string) => {
      setLoading(true);
      setError(null);
      setData(null);
      setCheckedLabel(label);
      try {
        const qs = new URLSearchParams({ tool });
        if (params.url) qs.set("url", params.url);
        if (params.url2) qs.set("url2", params.url2);
        if (params.keyword) qs.set("keyword", params.keyword);
        const res = await fetch(`/api/seo-check?${qs.toString()}`);
        const json = (await res.json()) as SeoToolResult;
        if (json.error) setError(json.error);
        else setData(json);
      } catch {
        setError("Could not run the check — network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [tool],
  );

  useEffect(() => {
    if (initialUrl && mode === "single") {
      void run({ url: initialUrl }, initialUrl);
    }
  }, [initialUrl, mode, run]);

  function reset() {
    setData(null);
    setError(null);
    setInput("");
    setInput2("");
    setKeyword("");
    setCheckedLabel("");
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const t = data ? tone(data.score) : null;

  return (
    <>
      {/* FORM */}
      <section className="bg-orange-50 dot-grid pb-16 sm:pb-20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4">
          <form
            className="flex flex-col gap-3 max-w-2xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "dual") {
                if (!input.trim() || !input2.trim()) return;
                void run({ url: input, url2: input2 }, `${input} vs ${input2}`);
              } else if (mode === "brief") {
                if (!keyword.trim()) return;
                void run({ keyword, url: input || undefined }, keyword);
              } else {
                if (!input.trim()) return;
                void run({ url: input }, input);
              }
            }}
          >
            {mode === "brief" ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Target keyword — e.g. emergency plumber austin"
                  required
                  className={inputCls}
                />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Your existing page URL (optional) — https://your-website.com/page"
                  autoComplete="url"
                  inputMode="url"
                  className={inputCls}
                />
              </>
            ) : mode === "dual" ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Your page — https://your-website.com/page"
                  required
                  autoComplete="url"
                  inputMode="url"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={input2}
                  onChange={(e) => setInput2(e.target.value)}
                  placeholder="Competitor page — https://competitor.com/page"
                  required
                  autoComplete="url"
                  inputMode="url"
                  className={inputCls}
                />
              </>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://your-website.com/page"
                required
                autoComplete="url"
                inputMode="url"
                className={inputCls}
              />
            )}
            <button type="submit" disabled={loading} className={`${btnPrimary} justify-center disabled:opacity-60`}>
              {loading ? "Checking…" : `Run the ${toolName} →`}
            </button>
          </form>
          {mode === "single" && (
            <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-stone-600">
              <span>
                Try:{" "}
                <button
                  type="button"
                  className="font-semibold text-orange-700"
                  onClick={() => {
                    setInput("https://frinjo.me");
                    void run({ url: "https://frinjo.me" }, "https://frinjo.me");
                  }}
                >
                  frinjo.me
                </button>
              </span>
              <span>
                <button
                  type="button"
                  className="font-semibold text-orange-700"
                  onClick={() => {
                    setInput("https://example.com");
                    void run({ url: "https://example.com" }, "https://example.com");
                  }}
                >
                  example.com
                </button>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-2xl mx-auto px-4 text-center text-stone-500 text-lg">
            🔍 Running the {toolName} on <span className="font-semibold text-stone-800">{checkedLabel}</span> —
            fetching the live page and analysing it…
          </div>
        </section>
      )}

      {/* ERROR */}
      {!loading && error && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-stone-900">Couldn&apos;t run that check</h2>
              <p className="mt-3 text-stone-600">{error}</p>
              <p className="mt-4">
                <button type="button" onClick={reset} className="font-semibold text-orange-700">
                  ← Try another URL
                </button>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* REPORT */}
      {!loading && data && t && (
        <section className="bg-white py-12 sm:py-16 border-t border-stone-100">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.15em] bg-orange-600 text-white rounded-full px-3 py-1 mb-4">
                {toolName} Report
              </span>
              <p className="font-display text-2xl sm:text-3xl font-bold text-stone-900" style={{ wordBreak: "break-all" }}>
                {data.finalUrl || data.url}
              </p>
              <p className="mt-3 text-sm text-stone-500">
                Checked {new Date(data.fetchedAt).toLocaleString()} ·{" "}
                <button type="button" onClick={reset} className="font-semibold text-orange-700">
                  Run another check
                </button>
              </p>
            </div>

            <div className="max-w-xs mx-auto mt-8">
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
                <div className={`font-display font-bold text-6xl ${t.text}`}>{data.score}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-500">
                  {toolName} Score · /100
                </div>
                <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${data.score}%` }} />
                </div>
              </div>
            </div>

            {data.summary && <p className="mt-8 text-stone-600 leading-relaxed text-center max-w-2xl mx-auto">{data.summary}</p>}

            {data.compare && (
              <div className="mt-10 overflow-x-auto rounded-3xl border border-stone-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-5 py-3 font-bold text-stone-900">Metric</th>
                      <th className="px-5 py-3 font-bold text-stone-900">{data.compare.aLabel}</th>
                      <th className="px-5 py-3 font-bold text-stone-900">{data.compare.bLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.compare.rows.map((r) => (
                      <tr key={r.label} className="border-t border-stone-100">
                        <td className="px-5 py-2.5 font-medium text-stone-800">{r.label}</td>
                        <td className="px-5 py-2.5 text-stone-600">{r.a}</td>
                        <td className="px-5 py-2.5 text-stone-600">{r.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.checks.length > 0 && (
              <div className="mt-10 rounded-3xl border border-stone-200 bg-white px-6 py-2">
                {data.checks.map((c) => (
                  <CheckRow key={c.label} c={c} />
                ))}
              </div>
            )}

            {data.items && data.items.length > 0 && (
              <div className="mt-10 overflow-x-auto rounded-3xl border border-stone-200">
                <table className="w-full text-sm">
                  <tbody>
                    {data.items.map((it, i) => (
                      <tr key={i} className={i === 0 ? "" : "border-t border-stone-100"}>
                        <td className="px-5 py-2.5 font-medium text-stone-800 align-top" style={{ wordBreak: "break-all" }}>
                          {it.status && (
                            <span className={`mr-2 font-bold ${it.status === "pass" ? "text-green-600" : it.status === "warn" ? "text-amber-500" : "text-red-500"}`}>
                              {it.status === "pass" ? "✓" : it.status === "warn" ? "!" : "✗"}
                            </span>
                          )}
                          {it.label}
                        </td>
                        <td className="px-5 py-2.5 text-stone-600" style={{ wordBreak: "break-word" }}>{it.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.rawText && (
              <div className="mt-10">
                <h3 className="font-display text-xl font-bold text-stone-900 mb-3">Raw file</h3>
                <pre className="rounded-3xl border border-stone-200 bg-stone-50 p-6 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap" style={{ wordBreak: "break-word" }}>
                  {data.rawText}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
