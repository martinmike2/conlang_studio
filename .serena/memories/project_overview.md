# Conlang Studio - Project Overview

## Purpose
Conlang Studio is a comprehensive web application for constructing languages (conlangs). It provides tools for designing and managing all aspects of a constructed language including phonology, morphology, syntax, semantics, orthography, lexicon, sociolinguistics, and diachronic evolution.

## Tech Stack

### Core Technologies
- **Language**: TypeScript (ES2024, strict mode)
- **Package Manager**: pnpm 10.17.1
- **Monorepo Tool**: Turborepo 2.5.8
- **Build Tool**: Vite (for tooling)

### Frontend (apps/web)
- **Framework**: Next.js 15.5.4 (App Router)
- **React**: 19.1.1
- **UI Libraries**: 
  - Material-UI (MUI) 6.1.3
  - Emotion (styling)
- **State Management**:
  - Zustand (local UI state)
  - TanStack Query 5.59.16 (server cache)
- **Data Visualization**: D3-force 3.0.0 (for graphs/trees)
- **Future**: Y.js for collaborative editing (Phase 3)

### Backend
- **Database**: PostgreSQL with JSONB support
- **ORM**: Drizzle ORM 0.44.5
- **Migrations**: Drizzle Kit (raw SQL migrations in packages/db/migrations)
- **Authentication**: NextAuth 5.0.0-beta.29 with Drizzle adapter
- **Password Hashing**: bcryptjs 2.4.3
- **Validation**: Zod 3.23.8
- **Logging**: Pino 9.12.0 with pino-pretty
- **Regex Engine**: re2 1.18.0 (safe regex execution)

### Testing
- **Unit/Integration**: Vitest 3.2.4
- **E2E**: Playwright 1.51.1
- **Test Database**: @electric-sql/pglite 0.2.8 (in-memory Postgres for tests)

### Development Tools
- **Linting**: ESLint 9.36.0 with TypeScript plugin 8.45.0
- **Formatting**: Prettier 3.6.2 (installed but no config file found - likely using defaults)
- **TypeScript**: 5.9.2

## Monorepo Structure

```
conlang_studio/
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   ├── core/             # Domain logic & Zod schemas
│   │   ├── semantics/
│   │   ├── morphology/
│   │   ├── borrowing/
│   │   ├── register/
│   │   ├── overlays/
│   │   ├── validation/
│   │   ├── metrics/
│   │   ├── diachrony/
│   │   ├── loanFlags/
│   │   └── activity/
│   ├── db/               # Database schema & migrations
│   ├── testkits/         # Shared test utilities & suites
│   └── config/           # Shared configurations
├── docs/                 # Architecture & implementation docs
└── scripts/              # Build & migration scripts
```

## Key Domain Modules
- **Phonology**: Phoneme inventories, phonotactic rules, suprasegmentals
- **Morphology**: Templates, morphemes, features, non-concatenative morphology (roots/patterns)
- **Syntax**: Word order, agreement, rules
- **Semantics**: Frames, senses, relations, idioms, classifier systems
- **Orthography**: Script mappings, transliteration
- **Lexicon**: Lexemes with phonological, morphological, and semantic properties
- **Sociolinguistics**: Variant overlays, borrowing pipeline, style policies, register
- **Diachrony**: Sound changes, lexical evolution, semantic drift
- **Psycholinguistics**: Complexity metrics (articulatory load, ambiguity, processing load)

## Architecture Highlights
- **Event-sourced versioning**: Immutable events with periodic snapshots
- **Engine-driven**: Rewrite engines for phonology, unification for agreement
- **JSONB flexibility**: Feature bundles and rule payloads stored as JSONB
- **Multi-tenancy**: Language membership roles (owner/editor/viewer/guest)
- **Performance**: Redis caching, granular invalidation, WASM for hot paths (planned)
- **Validation**: Comprehensive validators with QA panel integration