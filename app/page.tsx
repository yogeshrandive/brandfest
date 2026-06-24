"use client";

import { useState, useRef, useEffect } from "react";
import type {
  Occasion,
  OfferInput,
  PosterSize,
  GeneratedPoster,
  BrandConfig,
  VisualStyle,
} from "@/lib/types";
import { VISUAL_TEMPLATES, VISUAL_STYLE_ORDER } from "@/lib/templates";
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
  promptHints:
    "dynamic abstract background, bold diagonal light beams, premium commercial feel, clean lower area for text overlay, no text, no letters",
  theme: "promo",
};

type ActiveTab = "generate" | "brand";

// ─── Color picker row ────────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-white/60">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-white/10 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-[#F5B301]/50"
          placeholder="#000000"
        />
        <div
          className="w-6 h-6 rounded border border-white/20"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}

// ─── Visual style chips ───────────────────────────────────────────────────────

function StylePicker({
  value,
  onChange,
  compact = false,
}: {
  value: VisualStyle;
  onChange: (s: VisualStyle) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex gap-2 flex-wrap ${compact ? "" : "mt-1"}`}>
      {VISUAL_STYLE_ORDER.map((id) => {
        const t = VISUAL_TEMPLATES[id];
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={t.description}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              active
                ? "bg-[#F5B301] text-[#1A1A2E] border-[#F5B301]"
                : "bg-white/5 text-white/60 border-white/10 hover:border-[#F5B301]/40 hover:text-white"
            }`}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("generate");

  // ── Generate tab state ──
  const [mode, setMode] = useState<"occasion" | "offer">("occasion");
  const [selectedOccasionId, setSelectedOccasionId] = useState(occasions[0]?.id ?? "");
  const [offer, setOffer] = useState<OfferInput>(DEFAULT_OFFER);
  const [sizes, setSizes] = useState<PosterSize[]>(["square"]);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("luxury-dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<GeneratedPoster[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // ── Brand settings state ──
  const [brandForm, setBrandForm] = useState<BrandConfig | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaveResult, setBrandSaveResult] = useState<{
    persisted: boolean;
  } | null>(null);

  const selectedOccasion = occasions.find((o) => o.id === selectedOccasionId);

  // Load brand on mount
  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((data: BrandConfig) => {
        setBrandForm(data);
        if (data.visualStyle) setVisualStyle(data.visualStyle);
      })
      .catch(() => {})
      .finally(() => setBrandLoading(false));
  }, []);

  // ── Generate helpers ──

  function toggleSize(s: PosterSize) {
    setSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function updateOffer(field: keyof OfferInput, value: string) {
    setOffer((prev) => ({ ...prev, [field]: value }));
  }

  async function generate() {
    if (sizes.length === 0) {
      setError("Select at least one output size.");
      return;
    }
    if (mode === "offer" && !offer.headline.trim()) {
      setError("Headline is required for offer posters.");
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setPosters([]);

    try {
      const body =
        mode === "occasion"
          ? { mode, occasion: selectedOccasion, sizes, visualStyle }
          : { mode, offer, sizes, visualStyle };

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

  // ── Brand settings helpers ──

  function updateBrandField<K extends keyof BrandConfig>(
    field: K,
    value: BrandConfig[K]
  ) {
    setBrandForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setBrandSaveResult(null);
  }

  function updateBrandContact(
    field: keyof BrandConfig["contact"],
    value: string
  ) {
    setBrandForm((prev) =>
      prev ? { ...prev, contact: { ...prev.contact, [field]: value } } : prev
    );
    setBrandSaveResult(null);
  }

  function updateBrandColor(
    field: keyof BrandConfig["colors"],
    value: string
  ) {
    setBrandForm((prev) =>
      prev ? { ...prev, colors: { ...prev.colors, [field]: value } } : prev
    );
    setBrandSaveResult(null);
  }

  async function saveBrand() {
    if (!brandForm) return;
    setBrandSaving(true);
    setBrandSaveResult(null);
    try {
      const res = await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandForm),
      });
      const data = await res.json();
      setBrandForm(data.brand);
      setBrandSaveResult({ persisted: data.persisted });
      if (data.brand.visualStyle) setVisualStyle(data.brand.visualStyle);
    } catch {
      setBrandSaveResult({ persisted: false });
    } finally {
      setBrandSaving(false);
    }
  }

  function downloadBrandJson() {
    if (!brandForm) return;
    const blob = new Blob([JSON.stringify(brandForm, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#1A1A2E] text-white">
      {/* Header */}
      <header className="bg-[#16213E] border-b border-[#F5B301]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5B301] rounded-lg flex items-center justify-center font-bold text-[#1A1A2E] text-lg">
            SB
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#F5B301]">
              {brandForm?.name ?? "SocietyBee"}
            </h1>
            <p className="text-xs text-white/50">Poster Generator</p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(["generate", "brand"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[#F5B301] text-[#1A1A2E]"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab === "generate" ? "Generate" : "Brand Settings"}
            </button>
          ))}
        </div>
      </header>

      {/* ── Generate Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[380px_1fr] gap-8">
          {/* Left controls */}
          <section className="space-y-6">
            {/* Poster type toggle */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                Poster Type
              </label>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {(["occasion", "offer"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      mode === m
                        ? "bg-[#F5B301] text-[#1A1A2E]"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {m === "occasion" ? "Occasion" : "Offer / Promo"}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion picker */}
            {mode === "occasion" && (
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                  Select Occasion
                </label>
                <select
                  value={selectedOccasionId}
                  onChange={(e) => setSelectedOccasionId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5B301]/50"
                >
                  {occasions.map((o) => (
                    <option key={o.id} value={o.id} className="bg-[#1A1A2E]">
                      {o.title} — {o.date}
                    </option>
                  ))}
                </select>

                {selectedOccasion && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10 text-sm space-y-1">
                    <p className="font-semibold text-[#F5B301]">
                      {selectedOccasion.title}
                    </p>
                    <p className="text-white/60">{selectedOccasion.subtext}</p>
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#F5B301]/10 text-[#F5B301] border border-[#F5B301]/20 mt-1">
                      {selectedOccasion.theme}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Offer form */}
            {mode === "offer" && (
              <div className="space-y-3">
                {[
                  {
                    key: "headline",
                    label: "Headline *",
                    placeholder: "Festive Offer",
                  },
                  {
                    key: "subtext",
                    label: "Subtext",
                    placeholder: "Get 2 months free on annual plans",
                  },
                  {
                    key: "cta",
                    label: "Call to Action",
                    placeholder: "Call now to book a demo",
                  },
                  {
                    key: "validity",
                    label: "Validity",
                    placeholder: "Valid till 30 Nov 2026",
                  },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-white/40 block mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={offer[key as keyof OfferInput] ?? ""}
                      onChange={(e) =>
                        updateOffer(key as keyof OfferInput, e.target.value)
                      }
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Visual style */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                Visual Style
              </label>
              <StylePicker value={visualStyle} onChange={setVisualStyle} compact />
              <p className="text-xs text-white/30 mt-2">
                {VISUAL_TEMPLATES[visualStyle].description}
              </p>
            </div>

            {/* Output sizes */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                Output Sizes
              </label>
              <div className="space-y-2">
                {(Object.entries(SIZE_LABELS) as [PosterSize, string][]).map(
                  ([s, label]) => (
                    <label
                      key={s}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        sizes.includes(s)
                          ? "border-[#F5B301]/40 bg-[#F5B301]/5"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sizes.includes(s)}
                        onChange={() => toggleSize(s)}
                        className="accent-[#F5B301]"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading}
              className="w-full py-3.5 bg-[#F5B301] text-[#1A1A2E] font-bold text-base rounded-lg hover:bg-[#F5B301]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating…" : "Generate Poster"}
            </button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 space-y-2">
                <p>{error}</p>
                <button
                  onClick={generate}
                  className="text-red-300 underline underline-offset-2 text-xs hover:text-red-200"
                >
                  Retry
                </button>
              </div>
            )}
          </section>

          {/* Right — preview */}
          <section>
            {loading && (
              <div className="flex flex-col items-center justify-center h-80 gap-4">
                <div className="w-12 h-12 border-4 border-[#F5B301] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/50 text-sm">
                  Generating your poster… (~10–20s)
                </p>
              </div>
            )}

            {!loading && posters.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-80 gap-3 border border-dashed border-white/10 rounded-2xl">
                <div className="text-4xl opacity-30">🖼</div>
                <p className="text-white/30 text-sm">
                  Your poster preview will appear here
                </p>
              </div>
            )}

            {posters.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-semibold text-white/70 text-sm uppercase tracking-wide">
                  Preview &amp; Download
                </h2>
                <div className="grid gap-6">
                  {posters.map((poster) => (
                    <div
                      key={poster.size}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                    >
                      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                        <span className="text-sm font-medium text-white/70">
                          {SIZE_LABELS[poster.size]}
                        </span>
                        <button
                          onClick={() => downloadPoster(poster)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-[#F5B301] text-[#1A1A2E] text-xs font-bold rounded-lg hover:bg-[#F5B301]/90 transition-colors"
                        >
                          ↓ Download PNG
                        </button>
                      </div>
                      <div className="p-4 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={poster.dataUrl}
                          alt={poster.filename}
                          className={`rounded-lg shadow-2xl max-w-full ${
                            poster.size === "story"
                              ? "max-h-[500px] w-auto"
                              : "max-w-[400px]"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Brand Settings Tab ────────────────────────────────────────────────── */}
      {activeTab === "brand" && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          {brandLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-[#F5B301] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : brandForm ? (
            <>
              {/* Business Info */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Business Info
                </h2>
                <div className="grid gap-3">
                  {[
                    {
                      field: "name" as const,
                      label: "Business Name",
                      placeholder: "SocietyBee",
                    },
                    {
                      field: "category" as const,
                      label: "Category",
                      placeholder: "Housing Society Management App",
                    },
                    {
                      field: "tagline" as const,
                      label: "Tagline",
                      placeholder: "Smart living for modern societies",
                    },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-white/40 block mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={(brandForm[field] as string) ?? ""}
                        onChange={(e) =>
                          updateBrandField(field, e.target.value)
                        }
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      Business Description
                    </label>
                    <textarea
                      value={brandForm.businessDescription ?? ""}
                      onChange={(e) =>
                        updateBrandField("businessDescription", e.target.value)
                      }
                      rows={2}
                      placeholder="What does your business do?"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={brandForm.targetAudience ?? ""}
                      onChange={(e) =>
                        updateBrandField("targetAudience", e.target.value)
                      }
                      placeholder="e.g. RWA committees and apartment residents"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                    />
                  </div>
                </div>
              </section>

              {/* Contact Details */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Contact Details
                </h2>
                <div className="grid gap-3">
                  {[
                    {
                      field: "phone" as const,
                      label: "Phone",
                      placeholder: "+91-00000-00000",
                    },
                    {
                      field: "website" as const,
                      label: "Website",
                      placeholder: "yoursite.com",
                    },
                    {
                      field: "handle" as const,
                      label: "Social Handle",
                      placeholder: "@yourhandle",
                    },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-white/40 block mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={brandForm.contact[field]}
                        onChange={(e) =>
                          updateBrandContact(field, e.target.value)
                        }
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Brand Colors */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Brand Colors
                </h2>
                <div className="space-y-3">
                  <ColorField
                    label="Primary (accents, CTA buttons)"
                    value={brandForm.colors.primary}
                    onChange={(v) => updateBrandColor("primary", v)}
                  />
                  <ColorField
                    label="Secondary (scrim, background)"
                    value={brandForm.colors.secondary}
                    onChange={(v) => updateBrandColor("secondary", v)}
                  />
                  <ColorField
                    label="Accent (headline text)"
                    value={brandForm.colors.accent}
                    onChange={(v) => updateBrandColor("accent", v)}
                  />
                </div>

                {/* Live preview strip */}
                <div
                  className="rounded-xl overflow-hidden border border-white/10"
                  style={{ backgroundColor: brandForm.colors.secondary }}
                >
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{
                      borderBottom: `2px solid ${brandForm.colors.primary}20`,
                    }}
                  >
                    <span
                      className="font-bold text-lg"
                      style={{ color: brandForm.colors.accent }}
                    >
                      {brandForm.name}
                    </span>
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-lg"
                      style={{
                        backgroundColor: brandForm.colors.primary,
                        color: brandForm.colors.secondary,
                      }}
                    >
                      CTA Button
                    </span>
                  </div>
                  <div className="px-5 py-3 flex items-center gap-4">
                    <span
                      className="text-xs"
                      style={{ color: brandForm.colors.accent + "99" }}
                    >
                      {brandForm.contact.phone}
                    </span>
                    <span style={{ color: brandForm.colors.primary }}>•</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: brandForm.colors.primary }}
                    >
                      {brandForm.contact.website}
                    </span>
                    <span style={{ color: brandForm.colors.primary }}>•</span>
                    <span
                      className="text-xs"
                      style={{ color: brandForm.colors.accent + "99" }}
                    >
                      {brandForm.contact.handle}
                    </span>
                  </div>
                </div>
              </section>

              {/* Default Visual Style */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Default Visual Style
                </h2>
                <StylePicker
                  value={brandForm.visualStyle ?? "luxury-dark"}
                  onChange={(s) => updateBrandField("visualStyle", s)}
                />
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {VISUAL_STYLE_ORDER.map((id) => {
                    const t = VISUAL_TEMPLATES[id];
                    const active = (brandForm.visualStyle ?? "luxury-dark") === id;
                    return (
                      <button
                        key={id}
                        onClick={() => updateBrandField("visualStyle", id)}
                        className={`text-left px-4 py-3 rounded-xl border transition-all ${
                          active
                            ? "border-[#F5B301]/50 bg-[#F5B301]/5"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <span
                          className={`font-semibold text-sm ${
                            active ? "text-[#F5B301]" : "text-white/70"
                          }`}
                        >
                          {t.name}
                        </span>
                        <p className="text-xs text-white/40 mt-0.5">
                          {t.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Save / Actions */}
              <section className="space-y-3 pb-8">
                <div className="flex gap-3">
                  <button
                    onClick={saveBrand}
                    disabled={brandSaving}
                    className="flex-1 py-3 bg-[#F5B301] text-[#1A1A2E] font-bold rounded-lg hover:bg-[#F5B301]/90 disabled:opacity-60 transition-colors"
                  >
                    {brandSaving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={downloadBrandJson}
                    className="px-5 py-3 bg-white/5 border border-white/10 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Download JSON
                  </button>
                </div>

                {brandSaveResult?.persisted === true && (
                  <p className="text-green-400 text-sm text-center">
                    Saved successfully.
                  </p>
                )}

                {brandSaveResult?.persisted === false && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-300 space-y-1">
                    <p className="font-semibold">
                      Changes active for this session only.
                    </p>
                    <p className="text-amber-300/70">
                      On Vercel, the filesystem is read-only. Download the JSON
                      above, replace{" "}
                      <code className="font-mono bg-white/10 px-1 rounded">
                        config/brand.json
                      </code>{" "}
                      in your repo, and redeploy to make changes permanent.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <p className="text-white/40 text-sm text-center py-20">
              Failed to load brand settings.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
