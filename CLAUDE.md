# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FireTools is a web application for fire protection engineers in Spain. It provides technical calculators based on Spanish and European standards (UNE standards).

**Production URL:** https://fire-protection-tools.vercel.app

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # ESLint check
npm run preview  # Preview production build locally
npx vercel --prod  # Deploy to Vercel
```

## Architecture

```
src/
├── components/     # Reusable UI components (Layout, Navbar)
├── pages/          # Route pages
│   └── calculadoras/  # Calculator pages
├── utils/          # Calculation logic (pure functions)
│   ├── hydraulics.ts  # Hazen-Williams, sprinkler flow
│   └── detection.ts   # Detector spacing (UNE 23007)
└── App.tsx         # React Router configuration
```

### Key Patterns

- **Calculation functions** in `utils/` are pure TypeScript functions with no React dependencies
- **Type-only imports** required for interfaces due to `verbatimModuleSyntax` in tsconfig
- **Tailwind CSS v4** via Vite plugin (no tailwind.config.js needed)
- **Spanish language** for all UI text and variable names in domain logic

### Routing Structure

```
/                           → Home
/calculadoras               → Calculator index
/calculadoras/perdida-carga → Pressure loss (Hazen-Williams)
/calculadoras/caudal-rociadores → Sprinkler flow rate
/calculadoras/espaciamiento-detectores → Detector spacing
```

## Technical Standards Reference

- **UNE 23007:** Fire detection and alarm systems - detector coverage values
- **Hazen-Williams:** Hydraulic friction loss formula for fire protection piping
- **Sprinkler K-factor:** Q = K × √P formula for sprinkler discharge

## Future Development

Planned phases:
- Phase 2: PDF extraction tool for UNE standards (Python + tabula-py)
- Phase 3: Normative consultation module with Fuse.js search
- Phase 4: Q&A with local LLM (Ollama)
