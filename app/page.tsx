"use client";

import { useState, useEffect } from "react";
import type {
  PosterSize,
  GeneratedPoster,
  BrandConfig,
  Industry,
  Subcategory,
  ContentMoment,
  ImageStyle,
  CreativeBrief,
} from "@/lib/types";
import {
  getBrand,
  saveBrand,
  getModels,
  addModel as storeAddModel,
  deleteModel as storeDeleteModel,
  getActiveModels,
  setActiveModels as storeSetActiveModels,
} from "@/lib/clientStore";

const SIZE_LABELS: Record<PosterSize, string> = {
  square: "Square 1080×1080 (Post)",
  story: "Story 1080×1920 (Status/Reel)",
};

const IMAGE_STYLES: { id: ImageStyle; label: string; icon: string; desc: string }[] = [
  { id: "real-human", label: "Real Human", icon: "📸", desc: "Photographic, real people & places" },
  { id: "vector", label: "Vector", icon: "🎨", desc: "Flat illustration, shapes & motifs" },
  { id: "festive-decor", label: "Festive Decor", icon: "🪔", desc: "Decorative greeting card — lamps, flowers, motifs" },
];

type ActiveTab = "create" | "brand" | "models";

interface ModelResult {
  model: string;
  brief?: CreativeBrief;
  prompts?: { size: PosterSize; prompt: string }[];
  error?: string;
}

const GOLD = "#F5B301";

function emptyBrand(): BrandConfig {
  return {
    name: "",
    logoPath: "",
    industry: "",
    subCategory: "",
    tagline: "",
    website: "",
    colors: { primary: GOLD, secondary: "#1A1A2E", accent: "#FFFFFF" },
    contact: { phone: "", email: "", website: "", handle: "" },
    visualStyle: "luxury-dark",
  };
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  const base = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50";
  return (
    <div>
      <label className="text-xs text-white/40 block mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${base} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-white/60">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-white/10 bg-transparent p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm font-mono text-white focus:outline-none" />
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  // Taxonomy
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");

  // Creative config
  const [moment, setMoment] = useState<ContentMoment>("greeting");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("real-human");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<PosterSize[]>(["square"]);

  // Models
  const [models, setModels] = useState<string[]>([]);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState("");

  // Brand
  const [brand, setBrand] = useState<BrandConfig | null>(null);

  // Results
  const [results, setResults] = useState<ModelResult[]>([]);
  const [images, setImages] = useState<Record<string, GeneratedPoster>>({}); // key `${model}|${size}`
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const industry = industries.find((i) => i.id === industryId) ?? null;
  const subcategory: Subcategory | null = industry?.subcategories.find((s) => s.id === subcategoryId) ?? null;
  const onboarded = !!industryId && !!subcategoryId;

  // Load taxonomy + persisted state
  useEffect(() => {
    fetch("/api/industries").then((r) => r.json()).then((data: Industry[]) => {
      setIndustries(Array.isArray(data) ? data : []);
    }).catch(() => {});
    // Hydrate persisted state from localStorage (client-only).
    /* eslint-disable react-hooks/set-state-in-effect */
    setBrand(getBrand() ?? emptyBrand());
    setModels(getModels());
    setActiveModels(getActiveModels());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function chooseSubcategory(iId: string, sId: string) {
    setIndustryId(iId);
    setSubcategoryId(sId);
    setInputs({});
    setResults([]);
    setImages({});
    setError(null);
  }

  function setInput(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSize(s: PosterSize) {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleActiveModel(m: string) {
    const next = activeModels.includes(m) ? activeModels.filter((x) => x !== m) : [...activeModels, m];
    const final = next.length ? next : [m];
    setActiveModels(final);
    storeSetActiveModels(final);
  }

  function logoDataUrl(): string | null {
    return brand?.logoPath?.startsWith("data:") ? brand.logoPath : null;
  }

  // ── Generate briefs (compare across selected models) ──
  async function generate() {
    if (!onboarded) { setError("Pick a business category first."); return; }
    if (sizes.length === 0) { setError("Select at least one output size."); return; }
    setLoading(true);
    setError(null);
    setResults([]);
    setImages({});
    try {
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryId, subcategoryId, moment, inputs, sizes, imageStyle, brand, models: activeModels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Render an image for one model's brief + size ──
  async function renderImage(model: string, brief: CreativeBrief, size: PosterSize) {
    const key = `${model}|${size}`;
    setRendering((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, industryId, subcategoryId, moment, inputs, brief, imageStyle, brand, logoDataUrl: logoDataUrl() }),
      });
      const data = await res.json();
      if (res.ok && data.poster) setImages((p) => ({ ...p, [key]: data.poster }));
      else throw new Error(data.error ?? "Image failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image failed");
    } finally {
      setRendering((p) => ({ ...p, [key]: false }));
    }
  }

  function downloadPoster(poster: GeneratedPoster) {
    const a = document.createElement("a");
    a.href = poster.dataUrl;
    a.download = poster.filename;
    a.click();
  }

  // ── Brand helpers ──
  function updateBrand(patch: Partial<BrandConfig>) {
    setBrand((prev) => {
      const next = { ...(prev ?? emptyBrand()), ...patch } as BrandConfig;
      saveBrand(next);
      return next;
    });
  }
  function updateColor(field: keyof BrandConfig["colors"], v: string) {
    setBrand((prev) => {
      const base = prev ?? emptyBrand();
      const next = { ...base, colors: { ...base.colors, [field]: v } };
      saveBrand(next);
      return next;
    });
  }
  function updateContact(field: keyof BrandConfig["contact"], v: string) {
    setBrand((prev) => {
      const base = prev ?? emptyBrand();
      const next = { ...base, contact: { ...base.contact, [field]: v } };
      saveBrand(next);
      return next;
    });
  }
  function onLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => updateBrand({ logoPath: String(reader.result) });
    reader.readAsDataURL(file);
  }

  // ── Models tab helpers ──
  function addModelHandler() {
    if (!newModel.trim()) return;
    setModels(storeAddModel(newModel));
    setNewModel("");
  }
  function deleteModelHandler(m: string) {
    setModels(storeDeleteModel(m));
    setActiveModels(getActiveModels());
  }

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#1A1A2E] text-white">
      <header className="bg-[#16213E] border-b border-[#F5B301]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5B301] rounded-lg flex items-center justify-center font-bold text-[#1A1A2E] text-lg">BF</div>
          <div>
            <h1 className="font-bold text-xl text-[#F5B301]">BrandFest</h1>
            <p className="text-xs text-white/50">Creative Studio for Small Businesses</p>
          </div>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(["create", "brand", "models"] as ActiveTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? "bg-[#F5B301] text-[#1A1A2E]" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              {tab === "create" ? "Create" : tab === "brand" ? "Branding" : "Models"}
            </button>
          ))}
        </div>
      </header>

      {/* ── Onboarding: pick business category ── */}
      {activeTab === "create" && !onboarded && (
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-1">What kind of business do you run?</h2>
          <p className="text-white/50 text-sm mb-6">Pick a category to start. You can add your logo & details later.</p>
          <div className="space-y-6">
            {industries.map((ind) => (
              <div key={ind.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{ind.icon}</span>
                  <h3 className="font-semibold text-white/80">{ind.name}</h3>
                  <span className="text-xs text-white/30">{ind.description}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ind.subcategories.map((sub) => (
                    <button key={sub.id} onClick={() => chooseSubcategory(ind.id, sub.id)}
                      className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-[#F5B301]/50 text-left transition-all">
                      <div className="text-sm font-semibold text-white/80">{sub.name}</div>
                      <div className="text-xs text-white/40 mt-0.5 leading-tight">{sub.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {industries.length === 0 && <p className="text-white/30 text-sm">Loading categories…</p>}
          </div>
        </div>
      )}

      {/* ── Create ── */}
      {activeTab === "create" && onboarded && (
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[380px_1fr] gap-8">
          {/* Controls */}
          <section className="space-y-6">
            {/* Selected category */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#F5B301]/30 bg-[#F5B301]/5">
              <div>
                <div className="text-xs text-white/40">{industry?.name}</div>
                <div className="text-sm font-semibold text-[#F5B301]">{subcategory?.name}</div>
              </div>
              <button onClick={() => { setIndustryId(""); setSubcategoryId(""); }} className="text-xs text-white/40 hover:text-white">Change</button>
            </div>

            {!brand?.name && (
              <button onClick={() => setActiveTab("brand")} className="w-full text-left p-3 rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:border-[#F5B301]/40">
                ✦ Add your branding (logo, name, colours) for branded output →
              </button>
            )}

            {/* Moment toggle */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Content Type</label>
              <div className="flex gap-2">
                {(["greeting", "offer"] as ContentMoment[]).map((m) => (
                  <button key={m} onClick={() => { setMoment(m); setInputs({}); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${moment === m ? "bg-[#F5B301] text-[#1A1A2E] border-[#F5B301]" : "bg-white/5 text-white/60 border-white/10 hover:border-[#F5B301]/40"}`}>
                    {m === "greeting" ? "🎉 Greeting" : "🏷️ Offer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {moment === "greeting" ? (
                <>
                  <Field label="Occasion / Festival (optional)" value={inputs.festival ?? ""} onChange={(v) => setInput("festival", v)} placeholder="Diwali, New Year, Anniversary…" />
                  <Field label="Greeting Message" type="textarea" value={inputs.greetingMessage ?? ""} onChange={(v) => setInput("greetingMessage", v)} placeholder={subcategory?.greetingExamples[0]} />
                  {subcategory?.greetingExamples?.length ? (
                    <button onClick={() => setInput("greetingMessage", subcategory.greetingExamples[Math.floor(Math.random() * subcategory.greetingExamples.length)])} className="text-xs text-[#F5B301]/70 hover:text-[#F5B301]">✦ Suggest a message</button>
                  ) : null}
                  <Field label="From (optional)" value={inputs.fromName ?? ""} onChange={(v) => setInput("fromName", v)} placeholder={brand?.name || "Your business name"} />
                </>
              ) : (
                <>
                  <Field label="Offer Title" value={inputs.offerTitle ?? ""} onChange={(v) => setInput("offerTitle", v)} placeholder={subcategory?.offerExamples[0]} />
                  {subcategory?.offerExamples?.length ? (
                    <button onClick={() => setInput("offerTitle", subcategory.offerExamples[Math.floor(Math.random() * subcategory.offerExamples.length)])} className="text-xs text-[#F5B301]/70 hover:text-[#F5B301]">✦ Suggest an offer</button>
                  ) : null}
                  <Field label="Description (optional)" value={inputs.offerDescription ?? ""} onChange={(v) => setInput("offerDescription", v)} placeholder="Short supporting line" />
                  <Field label="Call to action (optional)" value={inputs.cta ?? ""} onChange={(v) => setInput("cta", v)} placeholder="Call Now, Book Today…" />
                  <Field label="Valid until (optional)" type="date" value={inputs.expiryDate ?? ""} onChange={(v) => setInput("expiryDate", v)} />
                </>
              )}
            </div>

            {/* Image style */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Image Style</label>
              <div className="flex gap-2">
                {IMAGE_STYLES.map((s) => (
                  <button key={s.id} onClick={() => setImageStyle(s.id)} title={s.desc}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${imageStyle === s.id ? "bg-[#F5B301] text-[#1A1A2E] border-[#F5B301]" : "bg-white/5 text-white/60 border-white/10 hover:border-[#F5B301]/40"}`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-2">{IMAGE_STYLES.find((s) => s.id === imageStyle)?.desc}</p>
            </div>

            {/* Models to compare */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-white/40">Compare Models</label>
                <button onClick={() => setActiveTab("models")} className="text-xs text-white/30 hover:text-white/60">Manage</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <button key={m} onClick={() => toggleActiveModel(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${activeModels.includes(m) ? "bg-[#F5B301]/15 text-[#F5B301] border-[#F5B301]/50" : "bg-white/5 text-white/50 border-white/10 hover:border-white/30"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Output Sizes</label>
              <div className="space-y-2">
                {(Object.entries(SIZE_LABELS) as [PosterSize, string][]).map(([s, label]) => (
                  <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sizes.includes(s) ? "border-[#F5B301]/40 bg-[#F5B301]/5" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <input type="checkbox" checked={sizes.includes(s)} onChange={() => toggleSize(s)} className="accent-[#F5B301]" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={generate} disabled={loading}
              className="w-full py-3.5 bg-[#F5B301] text-[#1A1A2E] font-bold text-base rounded-lg hover:bg-[#F5B301]/90 disabled:opacity-60 transition-colors">
              {loading ? "Thinking…" : activeModels.length > 1 ? `Compare ${activeModels.length} Models` : "Generate Idea"}
            </button>

            {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>}
          </section>

          {/* Results — side by side per model */}
          <section>
            {loading && (
              <div className="flex flex-col items-center justify-center h-80 gap-4">
                <div className="w-12 h-12 border-4 border-[#F5B301] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Creative Director is thinking…</p>
              </div>
            )}

            {!loading && results.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-80 gap-3 border border-dashed border-white/10 rounded-2xl">
                <div className="text-4xl opacity-30">🖼</div>
                <p className="text-white/30 text-sm">Your creative ideas will appear here</p>
              </div>
            )}

            {results.length > 0 && (
              <div className={`grid gap-4 ${results.length > 1 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                {results.map((r) => (
                  <div key={r.model} className="bg-white/3 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                      <span className="text-xs font-mono text-[#F5B301]">{r.model}</span>
                      {r.error && <span className="text-[10px] text-red-400">fallback</span>}
                    </div>
                    {r.brief && (
                      <div className="p-4 space-y-2 text-xs">
                        <div><span className="text-white/30 uppercase text-[10px]">Goal</span><p className="text-white/70 leading-snug">{r.brief.goal}</p></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-white/30 uppercase text-[10px]">Mood</span><p className="text-white/60">{r.brief.mood}</p></div>
                          <div><span className="text-white/30 uppercase text-[10px]">Subject</span><p className="text-white/60 leading-snug">{r.brief.subject}</p></div>
                        </div>
                      </div>
                    )}
                    {/* Render buttons + images per size */}
                    <div className="px-4 pb-4 space-y-3 mt-auto">
                      {sizes.map((size) => {
                        const key = `${r.model}|${size}`;
                        const poster = images[key];
                        const busy = rendering[key];
                        return (
                          <div key={size}>
                            {poster ? (
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={poster.dataUrl} alt={poster.filename} className="rounded-lg w-full" />
                                <button onClick={() => downloadPoster(poster)} className="w-full py-1.5 bg-[#F5B301] text-[#1A1A2E] text-xs font-bold rounded-lg">↓ Download {SIZE_LABELS[size]}</button>
                              </div>
                            ) : (
                              <button onClick={() => r.brief && renderImage(r.model, r.brief, size)} disabled={busy}
                                className="w-full py-2 border border-[#F5B301]/40 text-[#F5B301] text-xs font-semibold rounded-lg hover:bg-[#F5B301]/10 disabled:opacity-50">
                                {busy ? `Generating ${size}… (~30–60s)` : `🖼 Render image · ${SIZE_LABELS[size]}`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Branding ── */}
      {activeTab === "brand" && brand && (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">Your Branding (saved on this device)</h2>
          <Field label="Business Name" value={brand.name} onChange={(v) => updateBrand({ name: v })} placeholder="Your business name" />
          <Field label="Tagline" value={brand.tagline} onChange={(v) => updateBrand({ tagline: v })} placeholder="Your tagline" />
          <Field label="Website" value={brand.website} onChange={(v) => updateBrand({ website: v })} placeholder="yoursite.com" />

          <div>
            <label className="text-xs text-white/40 block mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {brand.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoPath} alt="logo" className="h-12 w-auto bg-white/10 rounded p-1" />
              ) : <div className="h-12 w-12 rounded bg-white/5 flex items-center justify-center text-white/20 text-xs">none</div>}
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} className="text-xs text-white/60" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs uppercase tracking-widest text-white/40">Colours</h3>
            <ColorField label="Primary (accents, CTA)" value={brand.colors.primary} onChange={(v) => updateColor("primary", v)} />
            <ColorField label="Secondary (scrim)" value={brand.colors.secondary} onChange={(v) => updateColor("secondary", v)} />
            <ColorField label="Accent (headline text)" value={brand.colors.accent} onChange={(v) => updateColor("accent", v)} />
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs uppercase tracking-widest text-white/40">Contact (footer)</h3>
            <Field label="Phone" value={brand.contact.phone} onChange={(v) => updateContact("phone", v)} placeholder="+91-00000-00000" />
            <Field label="Website" value={brand.contact.website} onChange={(v) => updateContact("website", v)} placeholder="yoursite.com" />
            <Field label="Social handle" value={brand.contact.handle} onChange={(v) => updateContact("handle", v)} placeholder="@yourhandle" />
          </div>
          <p className="text-xs text-white/30">Saved automatically in your browser. Nothing is uploaded.</p>
        </div>
      )}

      {/* ── Models ── */}
      {activeTab === "models" && (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">LLM Models</h2>
          <p className="text-xs text-white/50">Add any OpenRouter model id. Selected models run side-by-side when you generate, so you can compare their ideas. Stored on this device.</p>
          <div className="flex gap-2">
            <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="e.g. anthropic/claude-haiku-4-5"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50" />
            <button onClick={addModelHandler} className="px-4 py-2.5 bg-[#F5B301] text-[#1A1A2E] text-sm font-bold rounded-lg">Add</button>
          </div>
          <div className="space-y-2">
            {models.map((m) => (
              <div key={m} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={activeModels.includes(m)} onChange={() => toggleActiveModel(m)} className="accent-[#F5B301]" />
                  <span className="text-sm font-mono text-white/70">{m}</span>
                </div>
                <button onClick={() => deleteModelHandler(m)} className="text-xs text-red-400/70 hover:text-red-400">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
