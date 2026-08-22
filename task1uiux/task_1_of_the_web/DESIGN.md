---
name: Task 1 of the Web
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 16px
  margin-desktop: 32px
  margin-mobile: 16px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for precision and expert-level analysis. It targets strategy and research teams who require high information density without cognitive fatigue. The brand personality is rooted in credibility and focus, stripping away ornamental distractions to prioritize data clarity.

The visual direction follows a **Modern Minimalist** approach. It utilizes a restrained aesthetic characterized by functional whitespace, a disciplined grid, and a focus on content hierarchy. Surfaces are predominantly flat to avoid unnecessary visual noise, ensuring that the user's attention remains on competitive insights and market data.

## Colors
The palette is architectural and subdued, designed for long-term professional use.

- **Primary:** Deep Charcoal (#0F172A) is used for primary text and high-importance UI elements to ensure maximum contrast and readability.
- **Secondary (Accent):** Emerald Green (#059669) is the sole accent color. It is used sparingly for primary actions, success states, and key data callouts.
- **Neutrals:** A range of Slate grays provides the framework for borders, secondary text, and iconography.
- **Backgrounds:** Off-white/Slate-50 (#F8FAFC) serves as the base to reduce eye strain compared to pure white, while keeping the interface feeling crisp.

## Typography
Inter is the foundation of this design system, chosen for its exceptional legibility in data-heavy environments. The type scale is tight to facilitate information density.

For data visualization and technical identifiers (e.g., URLs, company IDs), **JetBrains Mono** is introduced at a small scale to provide a distinct visual "texture" for raw data vs. analyzed prose. Headlines use slight negative letter-spacing to maintain a compact, professional appearance.

## Layout & Spacing
The layout employs a **12-column fluid grid** for the main content area, with a fixed sidebar for navigation. A 4px baseline grid ensures consistent vertical rhythm.

- **Density:** Spacing is tighter than consumer apps to allow more data to be visible on one screen. 
- **Desktop:** 32px outer margins with 16px gutters.
- **Reflow:** On smaller screens, the sidebar collapses into a drawer, and the grid transitions to 4 columns.
- **Alignment:** All elements must align to the 4px increments to maintain the "precise" brand promise.

## Elevation & Depth
This design system avoids heavy shadows and physical metaphors. Depth is conveyed primarily through **Tonal Layering** and **Subtle Outlines**.

- **Level 0 (Base):** Background color (#F8FAFC).
- **Level 1 (Cards/Surface):** White (#FFFFFF) with a 1px border in Slate-200 (#E2E8F0).
- **Level 2 (Dropdowns/Modals):** White with a 1px border and a very soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05)`.

No blurs or glassmorphism are permitted. Contrast is used instead of depth to define focus.

## Shapes
Shapes are functional and conservative. The system uses a **Soft (0.25rem)** roundedness for standard elements like buttons and input fields to prevent the UI from feeling "sharp" or "hostile" while remaining professional.

- **Standard (0.25rem):** Buttons, Inputs, Checkboxes.
- **Large (0.5rem):** Cards, Containers, Modals.
- **Small (2px):** Data points in charts, small tags.

## Components
- **Buttons:** Primary buttons use the Charcoal background with white text. Secondary buttons use a Slate-200 border with Charcoal text. Padding should be 8px 16px for standard sizes.
- **Inputs:** Use a 1px Slate-200 border. On focus, the border changes to the Secondary Emerald Green with no outer glow.
- **Data Tables:** These are the core component. Use a 1px horizontal-only divider. Row height should be compact (32px or 40px). Header cells use `label-sm` with a light gray background.
- **Chips/Tags:** Use `label-md` with a neutral gray background (#F1F5F9). Avoid using vibrant colors for tags unless they represent specific status logic.
- **Cards:** Flat white backgrounds with 1px borders. Use generous internal padding (24px) to separate data groups.
- **Icons:** Use 16px or 20px functional line icons. Stroke width should be 1.5px to match the weight of the typography.