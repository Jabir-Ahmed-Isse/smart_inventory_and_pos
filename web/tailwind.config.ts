import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

/**
 * Emerald Enterprise design system — ported verbatim from the Stitch design tokens
 * (see design source `DESIGN.md`). Kept on Tailwind v3 config form so the exact
 * utility class strings from the source screens (e.g. `p-md`, `text-headline-xl`,
 * `bg-surface-container-low`) resolve identically → pixel-perfect parity.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "on-error": "#ffffff",
        "surface-container-lowest": "#ffffff",
        primary: "#006c49",
        "tertiary-fixed-dim": "#ffb95f",
        "secondary-fixed": "#d8e2ff",
        "surface-dim": "#d4dcd5",
        "surface-container-highest": "#dde4dd",
        tertiary: "#855300",
        "inverse-primary": "#4edea3",
        outline: "#6c7a71",
        "primary-fixed-dim": "#4edea3",
        "on-surface-variant": "#3c4a42",
        error: "#ba1a1a",
        "primary-fixed": "#6ffbbe",
        "surface-container-high": "#e3eae3",
        background: "#f4fbf4",
        "inverse-on-surface": "#ebf3eb",
        "outline-variant": "#bbcabf",
        "on-primary-fixed-variant": "#005236",
        "surface-container": "#e8f0e9",
        "on-surface": "#161d19",
        "surface-tint": "#006c49",
        "on-background": "#161d19",
        "on-secondary-fixed": "#001a42",
        "surface-variant": "#dde4dd",
        "secondary-fixed-dim": "#adc6ff",
        "on-tertiary-fixed": "#2a1700",
        "on-tertiary-container": "#523200",
        "tertiary-container": "#e29100",
        "surface-container-low": "#eef6ee",
        "on-tertiary": "#ffffff",
        secondary: "#0058be",
        "on-primary-container": "#00422b",
        "tertiary-fixed": "#ffddb8",
        "on-secondary-fixed-variant": "#004395",
        "on-primary": "#ffffff",
        "surface-bright": "#f4fbf4",
        "error-container": "#ffdad6",
        "on-primary-fixed": "#002113",
        "secondary-container": "#2170e4",
        "inverse-surface": "#2b322d",
        "on-tertiary-fixed-variant": "#653e00",
        "on-secondary-container": "#fefcff",
        "on-error-container": "#93000a",
        surface: "#f4fbf4",
        "primary-container": "#10b981",
        "on-secondary": "#ffffff",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        sm: "8px",
        xl: "40px",
        xs: "4px",
        md: "16px",
        gutter: "24px",
        base: "4px",
        lg: "24px",
        "container-max": "1440px",
      },
      maxWidth: {
        // Source screens use `max-w-container-max`; v3 maxWidth does not inherit
        // from `spacing`, so it is declared explicitly here.
        "container-max": "1440px",
        md: "28rem",
      },
      fontFamily: {
        "body-sm": ["Inter", "system-ui", "sans-serif"],
        "headline-lg": ["Inter", "system-ui", "sans-serif"],
        "headline-xl-mobile": ["Inter", "system-ui", "sans-serif"],
        "headline-xl": ["Inter", "system-ui", "sans-serif"],
        "display-lg": ["Inter", "system-ui", "sans-serif"],
        "label-md": ["Geist", "Inter", "system-ui", "sans-serif"],
        "body-md": ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-xl-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "headline-xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.04em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
      },
    },
  },
  plugins: [forms],
};

export default config;
