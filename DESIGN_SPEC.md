# Design Specification: FlowVision Landing Page
This document defines the exact visual architecture, geometry, and layout constraints required for the FlowVision landing page, mapping directly to our custom Tailwind CSS configuration.

## 1. Visual Architecture & Component Breakdown

### A. The Hero Section Capsule Backdrop (The Core Visual)
* **The Geometry:** A true, wide horizontal pill-capsule shape. It must use maximum rounding (`rounded-full` or a massive explicit radius like `rounded-[200px]`). It is **never** a rigid square or slightly rounded box.
* **The Border & Lighting:** Defined by an ultra-thin, high-contrast crisp stroke (`border border-candy-orange/30`). It must emit a rich, volumetric inner and outer ambient radiance using a soft drop shadow: `shadow-[0_0_80px_rgba(244,125,47,0.18)]`.
* **Layering:** Set to `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0`. The text and 3D spiral model sit directly inside/over it, while the left and right metric columns sit slightly over its outer curved arcs.
* **Translucency:** Uses `bg-onyx-black/40 backdrop-blur-sm` to allow background grid details to subtly peek through while isolating the center console workspace.

### B. Header Navigation & Dynamic Logo Swapping
* **Theme-Aware Branding:** The header navbar must seamlessly handle logo assets based on our Tailwind `darkMode: 'class'` configuration without layout flashes:
  * **Light Mode Active:** Display `/logo/new-logo-dark.png` using `block dark:hidden`.
  * **Dark Mode Active:** Display `/logo/new-logo.png` using `hidden dark:block`.
* **Sizing:** Fixed at a clean height constraint (e.g., `h-8 w-auto`) to protect navbar alignment.

### C. Densely Packed AI Features Grid (Zero Dead Space)
* **The Rule:** No large, floating empty spaces or awkward asymmetric gaps inside cards.
* **Structure:** A tight, professional modern SaaS grid layout (either an even 3-column split or a highly balanced row system).
* **Asset Scaling:** Visual assets within the cards must scale cleanly (`w-full object-cover`) to balance out text paragraphs, making the container feel dense and visually optimized.

## 2. Current Bug Diagnoses & Fix Directives

| Component / Issue | What is Failing Now | The Direct Fix |
| :--- | :--- | :--- |
| **Hero Capsule Geometry** | Edge-clipping or rendering as a rigid square because of low border-radius configurations. | Force `rounded-full`, check parent wrappers for unwanted constraints, and remove `overflow-hidden` from the direct capsule container so the blur can bleed out cleanly. |
| **Layout Scrollbar** | A prominent vertical layout scrollbar is appearing on the right edge because of layout height miscalculations combined with padding. | Change `section-one` to a hard viewport limit of `h-dvh` (or `h-screen`) coupled with `overflow-hidden`. Use a flex centering container (`flex items-center justify-center`) to position elements safely inside the screen bounds. |
| **AI Features Section** | Massive, unbalanced empty dark gaps pushing text into isolated corners. | Recalculate grid splits. Ensure text elements use explicit trailing boundaries (`max-w-prose`), and bundle component tags into packed wrapping structures (`flex flex-wrap gap-2`). |

## 3. Implementation Checklist for LLM Engines
1. Read this file completely before modifying any `app.vue`, `index.vue`, or component paths.
2. Ensure all colors map cleanly to the Onyx and Candy Orange palette variables in `tailwind.config.js`.
3. Keep the layout bounded strictly to `container mx-auto px-8` where layout limits apply.

---
