# QRForge Design System

## Aesthetic
Retro-hacker / ASCII art aesthetic. Pure black backgrounds, monospace typography, terminal green accents. Think 90s hacker terminal meets modern SaaS.

## Colors
- Background: `#000000` (pure black)
- Surface: `#0a0a0a` (cards, panels)
- Border: `#1a1a1a` (subtle borders)
- Border hover: `#333333`
- Text primary: `#ffffff`
- Text secondary: `#888888`
- Text muted: `#555555`
- Accent (terminal green): `#00FF41`
- Accent dim: `#00cc33`
- Accent glow: `rgba(0, 255, 65, 0.15)`
- Pro badge (amber): `#FFB800`
- Error: `#ff3333`

## Typography
- Font family: `JetBrains Mono`, monospace fallback
- Headings: bold, uppercase optional for small labels
- Body: 400 weight
- Sizes: text-xs through text-4xl, standard Tailwind scale

## Layout
- Max width: 1200px centered
- Generous padding (p-8 on desktop, p-4 on mobile)
- Cards: `border border-[#1a1a1a]` — NO rounded corners (or 2px max)
- No shadows — use border glow instead

## Components
- Buttons: bordered, no fill. Text in monospace. Hover fills with accent green + black text
- Inputs: black bg, border-[#1a1a1a], focus:border-[#00FF41]
- Tabs: underline style, not pill
- QR Preview: centered, green-on-black default

## Animations
- Typewriter text reveal on hero
- Blinking cursor `_` after headings
- Subtle glow pulse on accent elements

## Ad Slots
- `<AdBanner />` component — renders Google AdSense for free users, hidden for Pro
- Placed: below hero on landing, sidebar on generator, banner on dashboard
