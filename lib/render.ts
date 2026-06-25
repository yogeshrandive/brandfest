import satori from "satori";
import type { ReactNode } from "react";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import type { BrandConfig, PosterSize } from "./types";
import { SIZE_CONFIGS } from "./types";
import { getSafeZones } from "./layout";

let fontRegular: Buffer | null = null;
let fontBold: Buffer | null = null;
let fontSemiBold: Buffer | null = null;

function loadFonts() {
  if (!fontRegular) {
    const base = path.join(process.cwd(), "fonts");
    fontRegular = fs.readFileSync(path.join(base, "Poppins-Regular.ttf"));
    fontBold = fs.readFileSync(path.join(base, "Poppins-Bold.ttf"));
    fontSemiBold = fs.readFileSync(path.join(base, "Poppins-SemiBold.ttf"));
  }
}

function loadLogoBase64(logoPath: string): string {
  const abs = path.join(process.cwd(), logoPath);
  if (!fs.existsSync(abs)) return "";
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function resizeBackground(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(imageBuffer).resize(width, height, { fit: "cover" }).png().toBuffer();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface OverlayContent {
  title: string;
  subtext: string;
  cta?: string;
  validity?: string;
}

import type { TextOverlayContent } from "./promptBuilder";

export async function renderLogoAndFooter(
  backgroundBuffer: Buffer,
  content: TextOverlayContent,
  logoDataUrl: string | null,
  brand: BrandConfig,
  size: PosterSize
): Promise<Buffer> {
  loadFonts();

  const { width, height } = SIZE_CONFIGS[size];
  const zones = getSafeZones(size, width, height);

  const bgBuffer = await resizeBackground(backgroundBuffer, width, height);
  const bgBase64 = `data:image/png;base64,${bgBuffer.toString("base64")}`;
  // Use provided logoDataUrl, fall back to brand.logoPath
  const logoBase64 = logoDataUrl ?? loadLogoBase64(brand.logoPath);

  const primary = brand.colors.primary;
  const secondary = brand.colors.secondary;
  const accent = brand.colors.accent;

  const logoW = size === "square" ? 280 : 300;
  const logoH = size === "square" ? 70 : 76;
  const headlineSize = size === "square" ? 52 : 58;
  const subtextSize = size === "square" ? 28 : 32;
  const ctaSize = size === "square" ? 24 : 28;
  const contactSize = size === "square" ? 22 : 24;

  const scrimTopPct = (zones.scrim.top / height) * 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element: any = {
    type: "div",
    props: {
      style: { width, height, position: "relative", display: "flex", fontFamily: "Poppins", overflow: "hidden" },
      children: [
        // Background
        { type: "img", props: { src: bgBase64, style: { position: "absolute", top: 0, left: 0, width, height, objectFit: "cover" } } },

        // Dark scrim over lower portion for text readability
        {
          type: "div",
          props: {
            style: {
              position: "absolute", top: 0, left: 0, width, height,
              background: `linear-gradient(to bottom, transparent ${scrimTopPct - 8}%, ${hexToRgba(secondary, 0.82)} ${scrimTopPct + 10}%, ${hexToRgba(secondary, 0.95)} 100%)`,
            },
          },
        },

        // Logo — top-left
        logoBase64
          ? { type: "img", props: { src: logoBase64, style: { position: "absolute", top: zones.logo.top, left: 40, width: logoW, height: logoH, objectFit: "contain", objectPosition: "left center" } } }
          : { type: "div", props: { style: { position: "absolute", top: zones.logo.top, left: 40, backgroundColor: primary, borderRadius: 8, padding: "10px 20px", display: "flex", alignItems: "center" }, children: [{ type: "span", props: { style: { color: "#fff", fontWeight: 700, fontSize: 22 }, children: brand.name } }] } },

        // Text zone — headline + subtext + cta
        {
          type: "div",
          props: {
            style: { position: "absolute", top: zones.headline.top, left: zones.headline.left, right: zones.headline.right, display: "flex", flexDirection: "column", gap: 12 },
            children: [
              { type: "div", props: { style: { color: accent, fontSize: headlineSize, fontWeight: 700, lineHeight: 1.15, textShadow: `0 2px 8px ${hexToRgba(secondary, 0.6)}` }, children: content.headline } },
              { type: "div", props: { style: { width: 80, height: 4, backgroundColor: primary, borderRadius: 2, marginTop: 4 } } },
              ...(content.subtext ? [{ type: "div", props: { style: { color: hexToRgba(accent, 0.9), fontSize: subtextSize, fontWeight: 400, lineHeight: 1.4 }, children: content.subtext } }] : []),
              ...(content.fromName ? [{ type: "div", props: { style: { color: hexToRgba(accent, 0.75), fontSize: subtextSize - 4, fontWeight: 400 }, children: `From: ${content.fromName}` } }] : []),
              ...(content.cta ? [{
                type: "div", props: {
                  style: { display: "flex", marginTop: 8 },
                  children: [{ type: "div", props: { style: { backgroundColor: primary, color: secondary, fontSize: ctaSize, fontWeight: 700, padding: "10px 28px", borderRadius: 8 }, children: content.cta } }],
                },
              }] : []),
              ...(content.validity ? [{ type: "div", props: { style: { color: hexToRgba(primary, 0.85), fontSize: ctaSize - 4, marginTop: 4 }, children: content.validity } }] : []),
            ],
          },
        },

        // Contact footer — bottom strip
        {
          type: "div",
          props: {
            style: { position: "absolute", bottom: 0, left: 0, right: 0, height: zones.contact.height, backgroundColor: hexToRgba("#000000", 0.70), borderTop: `2px solid ${hexToRgba(primary, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 28, paddingLeft: 40, paddingRight: 40 },
            children: [
              { type: "div", props: { style: { color: accent, fontSize: contactSize, fontWeight: 400 }, children: brand.contact.phone } },
              { type: "div", props: { style: { color: hexToRgba(accent, 0.45), fontSize: contactSize }, children: "•" } },
              { type: "div", props: { style: { color: primary, fontSize: contactSize, fontWeight: 600 }, children: brand.contact.website } },
              { type: "div", props: { style: { color: hexToRgba(accent, 0.45), fontSize: contactSize }, children: "•" } },
              { type: "div", props: { style: { color: hexToRgba(accent, 0.8), fontSize: contactSize }, children: brand.contact.handle } },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(element, {
    width,
    height,
    fonts: [
      { name: "Poppins", data: fontRegular!, weight: 400, style: "normal" },
      { name: "Poppins", data: fontSemiBold!, weight: 600, style: "normal" },
      { name: "Poppins", data: fontBold!, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

export async function renderPoster(
  backgroundBuffer: Buffer,
  content: OverlayContent,
  brand: BrandConfig,
  size: PosterSize
): Promise<Buffer> {
  loadFonts();

  const { width, height } = SIZE_CONFIGS[size];
  const zones = getSafeZones(size, width, height);

  // Resize background to exact target dimensions
  const bgBuffer = await resizeBackground(backgroundBuffer, width, height);
  const bgBase64 = `data:image/png;base64,${bgBuffer.toString("base64")}`;
  const logoBase64 = loadLogoBase64(brand.logoPath);

  const primary = brand.colors.primary;
  const secondary = brand.colors.secondary;
  const accent = brand.colors.accent;

  const scrimTopPct = (zones.scrim.top / height) * 100;

  const headlineSize = size === "square" ? 52 : 58;
  const subtextSize = size === "square" ? 28 : 32;
  const ctaSize = size === "square" ? 24 : 28;
  const contactSize = size === "square" ? 22 : 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element: ReactNode = {
      type: "div",
      props: {
        style: {
          width,
          height,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Poppins",
          overflow: "hidden",
        },
        children: [
          // Background image layer
          {
            type: "img",
            props: {
              src: bgBase64,
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width,
                height,
                objectFit: "cover",
              },
            },
          },

          // Scrim gradient over lower portion
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width,
                height,
                background: `linear-gradient(to bottom, transparent ${scrimTopPct - 8}%, ${hexToRgba(secondary, 0.82)} ${scrimTopPct + 10}%, ${hexToRgba(secondary, 0.95)} 100%)`,
              },
            },
          },

          // Logo (top-right)
          logoBase64
            ? {
                type: "img",
                props: {
                  src: logoBase64,
                  style: {
                    position: "absolute",
                    top: zones.logo.top,
                    right: zones.logo.right,
                    width: zones.logo.width,
                    height: zones.logo.height,
                    objectFit: "contain",
                  },
                },
              }
            : {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: zones.logo.top,
                    right: zones.logo.right,
                    backgroundColor: primary,
                    borderRadius: 8,
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { color: secondary, fontWeight: 700, fontSize: 20 },
                        children: brand.name,
                      },
                    },
                  ],
                },
              },

          // Text zone
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: zones.headline.top,
                left: zones.headline.left,
                right: zones.headline.right,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              },
              children: [
                // Headline
                {
                  type: "div",
                  props: {
                    style: {
                      color: accent,
                      fontSize: headlineSize,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      textShadow: `0 2px 8px ${hexToRgba(secondary, 0.6)}`,
                    },
                    children: content.title,
                  },
                },

                // Accent bar
                {
                  type: "div",
                  props: {
                    style: {
                      width: 80,
                      height: 4,
                      backgroundColor: primary,
                      borderRadius: 2,
                      marginTop: 4,
                    },
                  },
                },

                // Subtext
                {
                  type: "div",
                  props: {
                    style: {
                      color: hexToRgba(accent, 0.9),
                      fontSize: subtextSize,
                      fontWeight: 400,
                      lineHeight: 1.4,
                    },
                    children: content.subtext,
                  },
                },

                // CTA chip (for offers)
                ...(content.cta
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            marginTop: 8,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  backgroundColor: primary,
                                  color: secondary,
                                  fontSize: ctaSize,
                                  fontWeight: 700,
                                  padding: "10px 24px",
                                  borderRadius: 8,
                                },
                                children: content.cta,
                              },
                            },
                          ],
                        },
                      },
                    ]
                  : []),

                // Validity (for offers)
                ...(content.validity
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            color: hexToRgba(primary, 0.85),
                            fontSize: ctaSize - 4,
                            fontWeight: 400,
                            marginTop: 4,
                          },
                          children: content.validity,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },

          // Contact bar (bottom)
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: zones.contact.height,
                backgroundColor: hexToRgba(primary, 0.15),
                borderTop: `2px solid ${hexToRgba(primary, 0.4)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 32,
                paddingLeft: 40,
                paddingRight: 40,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      color: accent,
                      fontSize: contactSize,
                      fontWeight: 400,
                    },
                    children: brand.contact.phone,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: hexToRgba(accent, 0.5),
                      fontSize: contactSize,
                    },
                    children: "•",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: primary,
                      fontSize: contactSize,
                      fontWeight: 600,
                    },
                    children: brand.contact.website,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: hexToRgba(accent, 0.5),
                      fontSize: contactSize,
                    },
                    children: "•",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: hexToRgba(accent, 0.8),
                      fontSize: contactSize,
                    },
                    children: brand.contact.handle,
                  },
                },
              ],
            },
          },
        ],
      },
  } as unknown as ReactNode;

  const svg = await satori(element, {
    width,
    height,
    fonts: [
      { name: "Poppins", data: fontRegular!, weight: 400, style: "normal" },
      { name: "Poppins", data: fontSemiBold!, weight: 600, style: "normal" },
      { name: "Poppins", data: fontBold!, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  const rendered = resvg.render();
  return rendered.asPng();
}
