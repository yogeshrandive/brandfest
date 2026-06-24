"use client";

import { useState, useRef } from "react";
import type { Occasion, OfferInput, PosterSize, GeneratedPoster } from "@/lib/types";
import occasionsData from "@/config/occasions.json";

const occasions: Occasion[] = occasionsData as Occasion[];

const SIZE_LABELS: Record<PosterSize, string> = {
  square: "Square 1080×1080 (Post)",
  story: "Story 1080×1920 (Status/Reel)",
};

const DEFAULT_OFFER: OfferInput = {
  headline: "",
  subtext: "",
  cta: "",
  validity: "",
  promptHints: "celebratory abstract background, brand gold accents, warm festive tones, clean lower area for text overlay, no text, no letters",
  theme: "promo",
};

export default function Home() {
  const [mode, setMode] = useState<"occasion" | "offer">("occasion");
  const [selectedOccasionId, setSelectedOccasionId] = useState(occasions[0]?.id ?? "");
  const [offer, setOffer] = useState<OfferInput>(DEFAULT_OFFER);
  const [sizes, setSizes] = useState<PosterSize[]>(["square"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<GeneratedPoster[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const selectedOccasion = occasions.find((o) => o.id === selectedOccasionId);

  function toggleSize(s: PosterSize) {
    setSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function updateOffer(field: keyof OfferInput, value: string) {
    setOffer((prev) => ({ ...prev, [field]: value }));
  }

  async function generate() {
    if (sizes.length === 0) { setError("Select at least one output size."); return; }
    if (mode === "offer" && !offer.headline.trim()) { setError("Headline is required for offer posters."); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null); setPosters([]);
    try {
      const body = mode === "occasion" ? { mode, occasion: selectedOccasion, sizes } : { mode, offer, sizes };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPosters(data.posters);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadPoster(poster: GeneratedPoster) {
    const a = document.createElement("a");
    a.href = poster.dataUrl;
    a.download = poster.filename;
    a.click();
  }

  return (
    <main className="min-h-screen bg-[#1A1A2E] text-white">
      <header className="bg-[#16213E] border-b border-[#F5B301]/20 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5B301] rounded-lg flex items-center justify-center font-bold text-[#1A1A2E] text-lg">SB</div>
          <div>
            <h1 className="font-bold text-xl text-[#F5B301]">SocietyBee</h1>
            <p className="text-xs text-white/50">Poster Generator</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[380px_1fr] gap-8">
        <section className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Poster Type</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(["occasion", "offer"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-[#F5B301] text-[#1A1A2E]" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}>{m === "occasion" ? "Occasion" : "Offer / Promo"}</button>
              ))}
            </div>
          </div>

          {mode === "occasion" && (
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Select Occasion</label>
              <select value={selectedOccasionId} onChange={(e) => setSelectedOccasionId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5B301]/50">
                {occasions.map((o) => <option key={o.id} value={o.id} className="bg-[#1A1A2E]">{o.title} — {o.date}</option>)}
              </select>
              {selectedOccasion && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10 text-sm space-y-1">
                  <p className="font-semibold text-[#F5B301]">{selectedOccasion.title}</p>
                  <p className="text-white/60">{selectedOccasion.subtext}</p>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#F5B301]/10 text-[#F5B301] border border-[#F5B301]/20 mt-1">{selectedOccasion.theme}</span>
                </div>
              )}
            </div>
          )}

          {mode === "offer" && (
            <div className="space-y-3">
              {[
                { key: "headline", label: "Headline *", placeholder: "Festive Offer" },
                { key: "subtext", label: "Subtext", placeholder: "Get 2 months free on annual plans" },
                { key: "cta", label: "Call to Action", placeholder: "Call now to book a demo" },
                { key: "validity", label: "Validity", placeholder: "Valid till 30 Nov 2026" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-white/40 block mb-1">{label}</label>
                  <input type="text" value={offer[key as keyof OfferInput] ?? ""}
                    onChange={(e) => updateOffer(key as keyof OfferInput, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50" />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Output Sizes</label>
            <div className="space-y-2">
              {(Object.entries(SIZE_LABELS) as [PosterSize, string][]).map(([s, label]) => (
                <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  sizes.includes(s) ? "border-[#F5B301]/40 bg-[#F5B301]/5" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}>
                  <input type="checkbox" checked={sizes.includes(s)} onChange={() => toggleSize(s)} className="accent-[#F5B301]" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading}
            className="w-full py-3.5 bg-[#F5B301] text-[#1A1A2E] font-bold text-base rounded-lg hover:bg-[#F5B301]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {loading ? "Generating…" : "Generate Poster"}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 space-y-2">
              <p>{error}</p>
              <button onClick={generate} className="text-red-300 underline underline-offset-2 text-xs hover:text-red-200">Retry</button>
            </div>
          )}
        </section>

        <section>
          {loading && (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
              <div className="w-12 h-12 border-4 border-[#F5B301] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/50 text-sm">Generating your poster… (~10–20s)</p>
            </div>
          )}
          {!loading && posters.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-80 gap-3 border border-dashed border-white/10 rounded-2xl">
              <div className="text-4xl opacity-30">🖼</div>
              <p className="text-white/30 text-sm">Your poster preview will appear here</p>
            </div>
          )}
          {posters.length > 0 && (
            <div className="space-y-6">
              <h2 className="font-semibold text-white/70 text-sm uppercase tracking-wide">Preview &amp; Download</h2>
              <div className="grid gap-6">
                {posters.map((poster) => (
                  <div key={poster.size} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                      <span className="text-sm font-medium text-white/70">{SIZE_LABELS[poster.size]}</span>
                      <button onClick={() => downloadPoster(poster)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#F5B301] text-[#1A1A2E] text-xs font-bold rounded-lg hover:bg-[#F5B301]/90 transition-colors">
                        ↓ Download PNG
                      </button>
                    </div>
                    <div className="p-4 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={poster.dataUrl} alt={poster.filename}
                        className={`rounded-lg shadow-2xl max-w-full ${poster.size === "story" ? "max-h-[500px] w-auto" : "max-w-[400px]"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
