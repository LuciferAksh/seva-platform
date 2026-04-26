---
design:
  colors:
    background:
      0: "#04080D"
      1: "#080F18"
      2: "#0C1520"
      3: "#111D2B"
    border:
      default: "#162130"
      bright: "#1E3247"
    text:
      primary: "#D8E8F2"
      secondary: "#5E7A8E"
      tertiary: "#243343"
    accent:
      default: "#00E5A0"
      dim: "rgba(0,229,160,0.08)"
      glow: "rgba(0,229,160,0.35)"
    semantic:
      danger: "#FF3A3A"
      dangerDim: "rgba(255,58,58,0.1)"
      warn: "#FFAB00"
      warnDim: "rgba(255,171,0,0.1)"
      info: "#38BDFF"
      infoDim: "rgba(56,189,255,0.1)"
      ai: "#B47EFF"
      aiDim: "rgba(180,126,255,0.1)"
    category:
      food: "#FFAB00"
      medical: "#FF3A3A"
      shelter: "#38BDFF"
      education: "#B47EFF"
      water: "#00E5A0"
      other: "#5E7A8E"
  typography:
    fonts:
      primary: "'DM Sans', sans-serif"
      heading: "'Syne', sans-serif"
      monospace: "'Space Mono', monospace"
    weights:
      light: 300
      regular: 400
      medium: 500
      semibold: 600
      bold: 700
      extrabold: 800
  radii:
    small: "4px"
    medium: "8px"
    large: "10px"
    xlarge: "16px"
    pill: "50%"
  shadows:
    glowAccent: "0 0 16px rgba(0,229,160,0.35)"
    glowAccentLarge: "0 0 20px rgba(0,229,160,0.35)"
    glowDanger: "0 0 32px rgba(255,58,58,0.5)"
    glowAi: "0 4px 16px rgba(180,126,255,0.3)"
    toast: "0 4px 24px rgba(0,0,0,0.4), 0 0 16px rgba(0,229,160,0.35)"
  motion:
    easings:
      easeOut: "ease-out"
      easeInOut: "ease-in-out"
      ease: "ease"
      linear: "linear"
    durations:
      fast: "0.15s"
      normal: "0.3s"
      slow: "0.8s"
      xslow: "1.8s"
    animations:
      pulseRing: "pulse-ring 1.8s ease-out infinite"
      pulseDot: "pulse-dot 1.8s ease-in-out infinite"
      fadeUp: "fadeUp 0.3s ease"
      fadeIn: "fadeIn 0.3s ease"
      slideRight: "slideRight 0.3s ease"
      scanline: "scanline 4s linear infinite"
      spin: "spin 0.8s linear infinite"
---

# SEVA Operations Platform

## Look & Feel
The SEVA Operations Platform utilizes a highly specialized, dark-themed dashboard tailored for emergency response, disaster management, and field coordination. The visual language conveys high-tech operational awareness, precision, and urgency without causing cognitive overload. It feels like a futuristic "mission control" interface, prioritizing data legibility and geographic tracking.

### Core Aesthetic
- **Cyber-Tactical Dark Mode:** The deep blue-black backgrounds (`#04080D` to `#111D2B`) create a low-emission, high-contrast environment. This is specifically designed for prolonged use by coordinators in low-light operations centers or field environments.
- **Neon Accents & Glows:** Interactive and critical elements use highly saturated, neon-leaning colors (like the `#00E5A0` teal accent). These elements often employ CSS box-shadows (`glow` tokens) to create a soft bloom effect, mimicking physical LED indicators on a hardware console.
- **Tactical Typography:** The interface combines three distinct typefaces to establish hierarchy and purpose:
  - **`DM Sans`** serves as the highly legible, geometric workhorse for all body copy and form inputs.
  - **`Syne`** is used for bold, authoritative headings, giving the application a modern, robust presence.
  - **`Space Mono`** is employed exclusively for data points, tags, metadata, and urgency scores. This monospaced font reinforces the "technical/data-driven" identity of the dashboard.

### Key Interactive Experiences
- **Pulsing Indicators:** Active missions, new reports, and live field recordings are accompanied by dual-ring CSS animations (`pulse-ring`, `pulse-dot`). These continuous, subtle pulses draw the operator's eye to active events on the map and active voice recordings without jarring alerts.
- **Fluid Micro-interactions:** Modals, toasts, and list items enter the screen with smooth `fadeUp` or `slideRight` animations. Hover states on buttons and cards feature slight border color transitions and glowing drop-shadows rather than hard background color shifts.
- **The "Scanline" Overlay:** The map container uses a continuous, transparent-to-teal linear gradient that pans vertically (`scanline 4s linear infinite`). This subtle ambient animation enhances the "live radar" aesthetic of the geographical tracking system.
- **Map Integration:** The geographic visualization (whether Satellite or Dark Mode) acts as the centerpiece. Overlaid SVG nodes use the application's semantic category colors with varying radii based on the `urgency_level` of the incident. High-urgency incidents emit a soft CSS drop-shadow bloom, and the AI Heatmap mode utilizes heavy blurs and screen blending to create realistic heat clusters.

### Semantic Intent
Colors are strictly tied to semantic meaning across the application:
- **Teal (`#00E5A0`)**: Primary action, positive reinforcement, completed tasks, and "Water" resources.
- **Red (`#FF3A3A`)**: High urgency (8-10/10), recording states, and "Medical" emergencies.
- **Amber (`#FFAB00`)**: Moderate urgency (6-7/10), assigned tasks, and "Food" resources.
- **Purple (`#B47EFF`)**: AI processing states, AI-driven match explanations, and "Education" resources.
- **Blue (`#38BDFF`)**: General information and "Shelter" resources.