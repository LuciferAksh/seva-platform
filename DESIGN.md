# Seva design system

Direction: calm, professional community coordination. Light warm surfaces, forest-green primary actions, restrained sage accents, clear hierarchy and meaningful status colors. Preserve the Seva name and sprout symbol across public, coordinator and volunteer experiences.

Typography: Manrope for headings; DM Sans for interface/body text. System sans-serif fallback remains usable offline. Dark text and deliberate contrast are preferred over pale dashboard labels.

Layout: an uncluttered public reporting site; a fixed workspace navigation rail on desktop and drawer navigation on mobile. A map and priority queue lead the coordinator overview, followed by filterable reports and the response team. Volunteers see their own work.

Components: responsive statistic cards, category icons, urgency and status badges, a real Leaflet map, incident detail/dispatch dialog, text/voice/photo intake, public receipt, photo review with confirmed counts, volunteer cards, impact breakdown and CSV export. Display real state derived from the selected dataset; do not invent performance percentages or live trends.

Accessibility: native labelled form controls, native modal dialogs with Escape handling and focus restoration, visible keyboard focus, skip links, reduced CSS motion, text labels accompanying status colors, and responsive layouts. Map information is also available through the report list. Do not make the map the only way to open a report.

Demo labels must stay visible. Public demo reports are not sent to responders; operational confidentiality and role enforcement come from the connected backend, not URL secrecy. Avoid exposing implementation details in normal public reporting flows.

Sources: `frontend/src/index.css`, `PublicHome.tsx`, `Workspace.tsx`, and `components/`. Brand SVG and app manifest are in `frontend/public/`.
