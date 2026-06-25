"use client";

import { useState, useEffect } from "react";
import type {
  PosterSize,
  GeneratedPoster,
  BrandConfig,
  VisualStyle,
  SceneDefinition,
  SceneInputValues,
  CreativeBrief,
} from "@/lib/types";

interface BrandAsset {
  filename: string;
  url: string;
  isLogo: boolean;
}
import { VISUAL_TEMPLATES, VISUAL_STYLE_ORDER } from "@/lib/templates";

const SIZE_LABELS: Record<PosterSize, string> = {
  square: "Square 1080×1080 (Post)",
  story: "Story 1080×1920 (Status/Reel)",
};

type ActiveTab = "create" | "brand";

// ─── Color picker ─────────────────────────────────────────────────────────────

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
        <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

// ─── Style chips ──────────────────────────────────────────────────────────────

function StylePicker({
  value,
  onChange,
}: {
  value: VisualStyle;
  onChange: (s: VisualStyle) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
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

// ─── Scene input renderer ─────────────────────────────────────────────────────

function SceneInputField({
  def,
  value,
  onChange,
}: {
  def: SceneDefinition["inputs"][0];
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-white/50">
          {def.label}
          {def.required && <span className="text-[#F5B301] ml-0.5">*</span>}
        </label>
        {def.randomizable && def.suggestions && (
          <button
            onClick={() => {
              const pool = def.suggestions!;
              onChange(pool[Math.floor(Math.random() * pool.length)]);
            }}
            className="text-xs text-[#F5B301]/60 hover:text-[#F5B301] transition-colors"
          >
            ✦ Random
          </button>
        )}
      </div>

      {def.type === "select" ? (
        <select
          value={value || def.default || ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          {!value && !def.default && (
            <option value="" className="bg-[#1A1A2E]">
              Choose…
            </option>
          )}
          {def.options?.map((o) => (
            <option key={o} value={o} className="bg-[#1A1A2E]">
              {o}
            </option>
          ))}
        </select>
      ) : def.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={2}
          className={`${base} resize-none`}
        />
      ) : def.type === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      ) : (
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.placeholder}
            className={base}
            list={def.suggestions ? `suggestions-${def.key}` : undefined}
          />
          {def.suggestions && (
            <datalist id={`suggestions-${def.key}`}>
              {def.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  // ── Scene state ──
  const [scenes, setScenes] = useState<SceneDefinition[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [sceneInputs, setSceneInputs] = useState<SceneInputValues>({});
  const [sizes, setSizes] = useState<PosterSize[]>(["square"]);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("luxury-dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<GeneratedPoster[]>([]);
  const [prompts, setPrompts] = useState<{ size: PosterSize; prompt: string }[]>([]);
  const [lastBrief, setLastBrief] = useState<CreativeBrief | null>(null);

  // ── Reference image state ──
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [selectedReference, setSelectedReference] = useState<string | null>(null); // filename
  const [referenceStrength, setReferenceStrength] = useState(0.15);

  // ── Brand state ──
  const [brandForm, setBrandForm] = useState<BrandConfig | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaveResult, setBrandSaveResult] = useState<{ persisted: boolean } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null;

  // Load scenes + brand on mount
  useEffect(() => {
    fetch("/api/scenes")
      .then((r) => r.json())
      .then((data: SceneDefinition[]) => {
        setScenes(data);
        if (data.length > 0) setSelectedSceneId(data[0].id);
      })
      .catch(() => {});

    fetch("/api/brand")
      .then((r) => r.json())
      .then((data: BrandConfig) => {
        setBrandForm(data);
        if (data.visualStyle) setVisualStyle(data.visualStyle);
      })
      .catch(() => {})
      .finally(() => setBrandLoading(false));

    fetch("/api/brand/assets")
      .then((r) => r.json())
      .then(({ assets: list }: { assets: BrandAsset[] }) => {
        setAssets(list);
        // Auto-select the logo as default reference
        const logo = list.find((a) => a.isLogo);
        if (logo) setSelectedReference(logo.filename);
      })
      .catch(() => {});
  }, []);

  // Reset inputs when scene changes
  useEffect(() => {
    if (!selectedScene) return;
    const defaults: SceneInputValues = {};
    selectedScene.inputs.forEach((i) => {
      if (i.default) defaults[i.key] = i.default;
    });
    setSceneInputs(defaults);
    setPosters([]);
    setPrompts([]);
    setLastBrief(null);
    setError(null);
  }, [selectedSceneId]);

  // ── Generate ──

  function toggleSize(s: PosterSize) {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function generate() {
    if (!selectedScene) return;
    if (sizes.length === 0) { setError("Select at least one output size."); return; }

    const missing = selectedScene.inputs
      .filter((i) => i.required && !sceneInputs[i.key])
      .map((i) => i.label);
    if (missing.length > 0) {
      setError(`Required: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    setError(null);
    setPosters([]);
    setPrompts([]);
    setLastBrief(null);

    try {
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          inputs: sceneInputs,
          sizes,
          visualStyle,
          referenceImage: selectedReference ?? undefined,
          referenceStrength,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      if (data.brief) setLastBrief(data.brief);
      if (data.prompts) setPrompts(data.prompts);
      if (data.posters) setPosters(data.posters);
    } catch (err) {
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

  // ── Brand helpers ──

  function updateBrandField<K extends keyof BrandConfig>(field: K, value: BrandConfig[K]) {
    setBrandForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setBrandSaveResult(null);
  }

  function updateBrandContact(field: keyof BrandConfig["contact"], value: string) {
    setBrandForm((prev) =>
      prev ? { ...prev, contact: { ...prev.contact, [field]: value } } : prev
    );
    setBrandSaveResult(null);
  }

  function updateBrandColor(field: keyof BrandConfig["colors"], value: string) {
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

  async function enrichBrand() {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/enrich-brand", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichment failed");
      setBrandForm(data.brand);
      setEnrichResult("Brand enriched with AI insights.");
    } catch (err) {
      setEnrichResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setEnriching(false);
    }
  }

  function downloadBrandJson() {
    if (!brandForm) return;
    const blob = new Blob([JSON.stringify(brandForm, null, 2)], { type: "application/json" });
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
            <h1 className="font-bold text-xl text-[#F5B301]">{brandForm?.name ?? "BrandFest"}</h1>
            <p className="text-xs text-white/50">Creative Generator</p>
          </div>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(["create", "brand"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[#F5B301] text-[#1A1A2E]"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab === "create" ? "Create" : "Brand Settings"}
            </button>
          ))}
        </div>
      </header>

      {/* ── Create Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[400px_1fr] gap-8">
          {/* Left controls */}
          <section className="space-y-6">

            {/* Scene picker */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-3 block">
                Creative Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      selectedSceneId === scene.id
                        ? "border-[#F5B301]/60 bg-[#F5B301]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xl mb-1">{scene.icon}</div>
                    <div className={`text-sm font-semibold ${selectedSceneId === scene.id ? "text-[#F5B301]" : "text-white/80"}`}>
                      {scene.name}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5 leading-tight">{scene.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene inputs */}
            {selectedScene && (
              <div className="space-y-4">
                <label className="text-xs uppercase tracking-widest text-white/40 block">
                  {selectedScene.name} Details
                </label>
                {selectedScene.inputs.map((def) => (
                  <SceneInputField
                    key={def.key}
                    def={def}
                    value={sceneInputs[def.key] ?? ""}
                    onChange={(v) =>
                      setSceneInputs((prev) => ({ ...prev, [def.key]: v }))
                    }
                  />
                ))}
              </div>
            )}

            {/* Reference image */}
            {assets.length > 0 && (
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                  Brand Reference Image
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {assets.map((asset) => (
                    <button
                      key={asset.filename}
                      onClick={() =>
                        setSelectedReference(
                          selectedReference === asset.filename ? null : asset.filename
                        )
                      }
                      className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                        selectedReference === asset.filename
                          ? "border-[#F5B301]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="w-full h-full object-contain bg-white/5 p-1"
                      />
                      {asset.isLogo && (
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] bg-[#F5B301]/80 text-[#1A1A2E] font-bold py-0.5">
                          Logo
                        </span>
                      )}
                      {selectedReference === asset.filename && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-[#F5B301] rounded-full flex items-center justify-center text-[#1A1A2E] text-[10px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedReference && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/40">Reference Strength</label>
                      <span className="text-xs text-[#F5B301] font-mono">{referenceStrength.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.05"
                      value={referenceStrength}
                      onChange={(e) => setReferenceStrength(parseFloat(e.target.value))}
                      className="w-full accent-[#F5B301]"
                    />
                    <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
                      <span>Subtle</span>
                      <span>Strong</span>
                    </div>
                  </div>
                )}
                {!selectedReference && (
                  <p className="text-xs text-white/30">No reference selected — AI generates freely</p>
                )}
              </div>
            )}

            {/* Visual style */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                Visual Style
              </label>
              <StylePicker value={visualStyle} onChange={setVisualStyle} />
              <p className="text-xs text-white/30 mt-2">{VISUAL_TEMPLATES[visualStyle].description}</p>
            </div>

            {/* Output sizes */}
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">
                Output Sizes
              </label>
              <div className="space-y-2">
                {(Object.entries(SIZE_LABELS) as [PosterSize, string][]).map(([s, label]) => (
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
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={generate}
              disabled={loading || !selectedScene}
              className="w-full py-3.5 bg-[#F5B301] text-[#1A1A2E] font-bold text-base rounded-lg hover:bg-[#F5B301]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating…" : "Generate Creative"}
            </button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
          </section>

          {/* Right — preview */}
          <section>
            {loading && (
              <div className="flex flex-col items-center justify-center h-80 gap-4">
                <div className="w-12 h-12 border-4 border-[#F5B301] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/50 text-sm">AI is crafting your creative… (~15–30s)</p>
              </div>
            )}

            {!loading && posters.length === 0 && prompts.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-80 gap-3 border border-dashed border-white/10 rounded-2xl">
                <div className="text-4xl opacity-30">🖼</div>
                <p className="text-white/30 text-sm">Your creative brief will appear here</p>
              </div>
            )}

            {(lastBrief || prompts.length > 0 || posters.length > 0) && (
              <div className="space-y-6">
                {/* Creative Brief card */}
                {lastBrief && (
                  <div className="p-4 bg-white/3 border border-white/10 rounded-xl space-y-3">
                    <p className="text-xs uppercase tracking-widest text-white/30">Creative Brief</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                      {[
                        { label: "Goal", value: lastBrief.goal },
                        { label: "Mood", value: lastBrief.mood },
                        { label: "Scene", value: lastBrief.scene },
                        { label: "Subject", value: lastBrief.subject },
                        { label: "Lighting", value: lastBrief.lighting },
                        { label: "Composition", value: lastBrief.composition },
                      ].map(({ label, value }) => (
                        <div key={label} className="col-span-2 sm:col-span-1">
                          <span className="text-white/30 font-semibold uppercase tracking-wide text-[10px]">{label}</span>
                          <p className="text-white/60 mt-0.5 leading-snug">{value}</p>
                        </div>
                      ))}
                    </div>
                    {lastBrief.visualKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {lastBrief.visualKeywords.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Per-size prompts */}
                {prompts.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-white/70 text-sm uppercase tracking-wide">
                      FAL Image Prompts
                    </h2>
                    {prompts.map(({ size, prompt }) => (
                      <div key={size} className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#F5B301]">{SIZE_LABELS[size]}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(prompt)}
                            className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="p-4 text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                          {prompt}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* Poster previews (when image gen is re-enabled) */}
                {posters.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-semibold text-white/70 text-sm uppercase tracking-wide">
                      Preview &amp; Download
                    </h2>
                    {posters.map((poster) => (
                      <div key={poster.size} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                          <span className="text-sm font-medium text-white/70">{SIZE_LABELS[poster.size]}</span>
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
                            className={`rounded-lg shadow-2xl max-w-full ${poster.size === "story" ? "max-h-[500px] w-auto" : "max-w-[400px]"}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    { field: "name" as const, label: "Business Name", placeholder: "SocietyBee" },
                    { field: "industry" as const, label: "Industry", placeholder: "Software" },
                    { field: "subCategory" as const, label: "What you actually sell", placeholder: "Billing software for housing societies" },
                    { field: "tagline" as const, label: "Tagline", placeholder: "Let the Bee Manage, You Relax" },
                    { field: "website" as const, label: "Website", placeholder: "societybee.in" },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-white/40 block mb-1">{label}</label>
                      <input
                        type="text"
                        value={(brandForm[field] as string) ?? ""}
                        onChange={(e) => updateBrandField(field, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-white/40 block mb-1">Business Description</label>
                    <textarea
                      value={brandForm.businessDescription ?? ""}
                      onChange={(e) => updateBrandField("businessDescription", e.target.value)}
                      rows={3}
                      placeholder="What does your business do? Who does it serve?"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 block mb-1">Target Audience (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(brandForm.targetAudience) ? brandForm.targetAudience.join(", ") : brandForm.targetAudience ?? ""}
                      onChange={(e) =>
                        updateBrandField("targetAudience", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                      }
                      placeholder="CAs, Treasurers, Society managers"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#F5B301]/50"
                    />
                  </div>
                </div>
              </section>

              {/* Brand Personality */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Brand Personality
                </h2>
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-2">Brand Style</label>
                    <div className="flex flex-wrap gap-2">
                      {(["Premium", "Corporate", "Modern", "Minimal", "Luxury", "Friendly", "Traditional", "Bold"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateBrandField("brandStyle", s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            brandForm.brandStyle === s
                              ? "bg-[#F5B301] text-[#1A1A2E] border-[#F5B301]"
                              : "bg-white/5 text-white/60 border-white/10 hover:border-[#F5B301]/40"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/40 block mb-2">Brand Voice</label>
                    <div className="flex flex-wrap gap-2">
                      {(["Professional", "Friendly", "Inspirational", "Luxury", "Youthful"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => updateBrandField("brandVoice", v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            brandForm.brandVoice === v
                              ? "bg-[#F5B301] text-[#1A1A2E] border-[#F5B301]"
                              : "bg-white/5 text-white/60 border-white/10 hover:border-[#F5B301]/40"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
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
                    { field: "phone" as const, label: "Phone", placeholder: "+91-00000-00000" },
                    { field: "email" as const, label: "Email", placeholder: "hello@yoursite.com" },
                    { field: "website" as const, label: "Website", placeholder: "yoursite.com" },
                    { field: "handle" as const, label: "Social Handle", placeholder: "@yourhandle" },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-white/40 block mb-1">{label}</label>
                      <input
                        type="text"
                        value={(brandForm.contact[field] as string) ?? ""}
                        onChange={(e) => updateBrandContact(field, e.target.value)}
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
                  <ColorField label="Primary (accents, CTA buttons)" value={brandForm.colors.primary} onChange={(v) => updateBrandColor("primary", v)} />
                  <ColorField label="Secondary (scrim, background)" value={brandForm.colors.secondary} onChange={(v) => updateBrandColor("secondary", v)} />
                  <ColorField label="Accent (headline text)" value={brandForm.colors.accent} onChange={(v) => updateBrandColor("accent", v)} />
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10" style={{ backgroundColor: brandForm.colors.secondary }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `2px solid ${brandForm.colors.primary}20` }}>
                    <span className="font-bold text-lg" style={{ color: brandForm.colors.accent }}>{brandForm.name}</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-lg" style={{ backgroundColor: brandForm.colors.primary, color: brandForm.colors.secondary }}>
                      CTA Button
                    </span>
                  </div>
                  <div className="px-5 py-3 flex items-center gap-4 flex-wrap">
                    <span className="text-xs" style={{ color: brandForm.colors.accent + "99" }}>{brandForm.contact.phone}</span>
                    <span style={{ color: brandForm.colors.primary }}>•</span>
                    <span className="text-xs font-semibold" style={{ color: brandForm.colors.primary }}>{brandForm.contact.website}</span>
                    <span style={{ color: brandForm.colors.primary }}>•</span>
                    <span className="text-xs" style={{ color: brandForm.colors.accent + "99" }}>{brandForm.contact.handle}</span>
                  </div>
                </div>
              </section>

              {/* Default Visual Style */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Default Visual Style
                </h2>
                <StylePicker value={brandForm.visualStyle ?? "luxury-dark"} onChange={(s) => updateBrandField("visualStyle", s)} />
              </section>

              {/* Brand Assets */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  Brand Assets
                </h2>
                <p className="text-xs text-white/40">
                  Place images in <code className="font-mono bg-white/10 px-1 rounded">public/brand/</code> folder.
                  Files with &quot;logo&quot; in the name are auto-detected as the logo.
                </p>
                {assets.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {assets.map((asset) => (
                      <div key={asset.filename} className="space-y-1">
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-square flex items-center justify-center p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.url}
                            alt={asset.filename}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-[10px] text-white/40 truncate text-center">{asset.filename}</p>
                        {asset.isLogo && (
                          <p className="text-[10px] text-[#F5B301] text-center font-semibold">Logo</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-white/10 rounded-xl text-center">
                    <p className="text-white/30 text-sm">No images found in public/brand/</p>
                    <p className="text-white/20 text-xs mt-1">Upload PNG/JPG files to that folder and redeploy</p>
                  </div>
                )}
              </section>

              {/* AI Enrichment */}
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10 pb-2">
                  AI Brand Enrichment
                </h2>
                <p className="text-xs text-white/40">
                  Let AI analyse your business and generate visual keywords, brand summary and art direction — used automatically in every creative prompt.
                </p>
                {brandForm.industryVisualKeywords && brandForm.industryVisualKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {brandForm.industryVisualKeywords.map((kw) => (
                      <span key={kw} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {brandForm.brandSummary && (
                  <p className="text-xs text-white/50 italic">{brandForm.brandSummary}</p>
                )}
                <button
                  onClick={enrichBrand}
                  disabled={enriching}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  {enriching ? "Enriching…" : "✦ Enrich with AI"}
                </button>
                {enrichResult && (
                  <p className="text-xs text-[#F5B301]/80">{enrichResult}</p>
                )}
              </section>

              {/* Save actions */}
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
                  <p className="text-green-400 text-sm text-center">Saved successfully.</p>
                )}
                {brandSaveResult?.persisted === false && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-300 space-y-1">
                    <p className="font-semibold">Changes active for this session only.</p>
                    <p className="text-amber-300/70">
                      Download the JSON above, replace{" "}
                      <code className="font-mono bg-white/10 px-1 rounded">config/brand.json</code>{" "}
                      in your repo, and redeploy to make changes permanent.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <p className="text-white/40 text-sm text-center py-20">Failed to load brand settings.</p>
          )}
        </div>
      )}
    </main>
  );
}
