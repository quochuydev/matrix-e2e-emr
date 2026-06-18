---
version: alpha
name: Patient Records
description: "A trust-first UI for an end-to-end-encrypted patient record system. Neutral grayscale canvas and near-black primary actions, with a teal→blue brand gradient as the chromatic signature (brand mark, active nav, highlight cards). A left sidebar app shell holds navigation; content sits in a card-based layout. Reads as clinical software: quiet, dense where it counts, never alarming."

# Tokens below are the source of truth. The web app implements them as
# CSS custom properties in web/src/app/globals.css using oklch(); the oklch
# equivalent is noted beside each color. Keep the two in sync.

colors:
  # Brand & accent — the ONLY chromatic color in the system. Use it scarcely.
  primary: "#18181b" # near-black — primary CTAs, default buttons   | oklch(0.205 0 0)
  on-primary: "#fafafa" # text/icon on primary                          | oklch(0.985 0 0)
  primary-hover: "#27272a" # primary hover                                 | oklch(0.269 0 0)
  accent: "#3d63dd" # trust-blue — focus rings, links, "secure" badge ONLY
  on-accent: "#ffffff"
  accent-soft: "#eef2ff" # accent tint for secure/info backgrounds (light)
  brand-from: "#46cfc3" # brand gradient start — teal | oklch(0.84 0.12 172)
  brand-to: "#4a86db" # brand gradient end — blue  | oklch(0.68 0.14 248)

  # Text (ink)
  ink: "#18181b" # primary text                                  | oklch(0.145 0 0)
  ink-muted: "#52525b" # secondary text, labels                        | oklch(0.556 0 0)
  ink-subtle: "#8a8a8a" # placeholder, timestamps, hints                | oklch(0.708 0 0)
  ink-on-canvas-inverse: "#fafafa"

  # Surfaces
  canvas: "#ffffff" # page background                               | oklch(1 0 0)
  surface-1: "#fafafa" # cards, header bar (bg-card / bg-card/50)       | oklch(0.985 0 0)
  surface-2: "#f4f4f5" # muted fills, table header, message bubble (them)| oklch(0.97 0 0)
  surface-3: "#e9e9eb" # pressed / nested fills

  # Hairlines
  hairline: "#e4e4e7" # default borders                               | oklch(0.922 0 0)
  hairline-strong: "#d4d4d8"
  hairline-dashed: "#d4d4d8" # empty-state dashed borders

  # Inverse (dark theme base — see .dark in globals.css)
  inverse-canvas: "#242424" # oklch(0.145 0 0)
  inverse-surface-1: "#333333" # oklch(0.205 0 0)
  inverse-ink: "#fafafa" # oklch(0.985 0 0)

  # Semantic
  semantic-secure: "#3d63dd" # encryption / verified / trust — uses accent
  semantic-success: "#16a34a" # ready, synced, joined
  semantic-warning: "#d97706" # catching up, read-only, action needed
  semantic-danger: "#dc2626" # destructive, decryption failure, invites    | destructive oklch(0.577 0.245 27.325)
  semantic-overlay: "rgba(24,24,27,0.45)" # dialog backdrop

typography:
  display:
    fontFamily: system-ui
    fontSize: 28 # h1 — 2em @ 14px root
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.2
  heading:
    fontFamily: system-ui
    fontSize: 21 # h2 — 1.5em
    fontWeight: 600
    lineHeight: 1.25
  subheading:
    fontFamily: system-ui
    fontSize: 17.5 # h3 — 1.25em
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: system-ui
    fontSize: 14 # root size; html { font-size: 14px }
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: system-ui
    fontSize: 12.25 # 0.875em — form labels, badges
    fontWeight: 500
    lineHeight: 1.25
  caption:
    fontFamily: system-ui
    fontSize: 11 # timestamps, hints, status text
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: ui-monospace
    fontSize: 11.9 # 0.85em — IDs, keys, diagnostics ONLY
    fontWeight: 400
    lineHeight: 1.5

rounded:
  xs: 6 # --radius-sm  (radius * 0.6)
  sm: 8 # --radius-md  (radius * 0.8)
  md: 10 # --radius-lg / --radius (0.625rem @ 16px = 10px)
  lg: 14 # --radius-xl
  xl: 18 # --radius-2xl
  pill: 9999

spacing:
  xxs: 4
  xs: 8
  sm: 12
  md: 16
  lg: 24
  xl: 32
  xxl: 48
  section: 64

components:
  button:
    height: 32 # default size h-8
    radius: "{rounded.md}"
    padding-x: 10
    font: "{typography.label}"
  badge:
    radius: "{rounded.sm}"
    font: "{typography.caption}"
  input:
    height: 36
    radius: "{rounded.sm}"
    border: "{colors.hairline}"
    focus-ring: "{colors.accent}"
  card:
    radius: "{rounded.md}"
    border: "{colors.hairline}"
    background: "{colors.surface-1}"
  dialog:
    radius: "{rounded.lg}"
    max-width: 480
    backdrop: "{colors.semantic-overlay}"
---

# Patient Records — Design System

> Plain-markdown design system in the [VoltAgent `awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) format. The YAML front matter is the token source of truth; the prose below explains intent, semantics, and the product-specific UX rules an agent must follow when building or changing UI. Reference tokens in prose as `{category.token}`.

## 1. Visual Theme & Atmosphere

Patient Records is medical-grade software handling end-to-end-encrypted records. The UI must feel **calm, precise, and trustworthy** — never playful, never alarming.

- **Neutral first.** The canvas, surfaces, and text are pure grayscale. Color is information, not decoration.
- **One chromatic signature.** The teal→blue brand gradient (`{colors.brand-from}` → `{colors.brand-to}`) is the brand's only color, used scarcely: the brand mark, the active-nav indicator, and at most one highlight card per view. Solid `{colors.accent}` (the blue end) marks focus rings, links, and the encryption/secure indicator. Everything else is neutral grayscale — if color is everywhere, nothing reads as "secure."
- **Density where it earns it.** Clinic-facing tables and timelines are information-dense; patient-facing views are airy and reassuring. Same tokens, different rhythm.
- **Quiet status, loud only on danger.** Healthy states (ready, synced, encrypted) are muted/neutral. Reserve saturated color for genuine problems (`{colors.semantic-danger}`) and required actions (`{colors.semantic-warning}`).
- **No raw cryptography in the foreground.** Room IDs, device IDs, session IDs, Megolm/SSSS terminology, and decryption diagnostics are _expert detail_, not primary content. They live behind progressive disclosure (see §7, §9).

Key characteristics: neutral grayscale · single trust-blue accent · system font · 14px root · 10px corners · generous hairlines · role-aware density.

## 2. Color Palette & Roles

### Brand & Accent

| Role           | Token                                      | Use                                                              |
| -------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Primary action | `{colors.primary}` / `{colors.on-primary}` | Default & primary buttons (near-black, matches current build)    |
| Brand gradient | `{colors.brand-from}` → `{colors.brand-to}` | Brand mark, active-nav accent, one highlight card per view (`.bg-brand-gradient`) |
| Trust accent   | `{colors.accent}` / `{colors.on-accent}`   | Focus rings, text links, the single "Encrypted/Secure" indicator |
| Accent tint    | `{colors.accent-soft}`                     | Background of secure/info callouts only                          |

The gradient and accent are **scarce**. Do not use them for headings, generic icons, hover fills, or secondary buttons. Text and icons on the gradient are **white** (`#fff`, body at ~85% opacity) for legibility on the saturated teal→blue.

### Surfaces & Text

| Role                                            | Token                                            |
| ----------------------------------------------- | ------------------------------------------------ |
| Page background                                 | `{colors.canvas}`                                |
| Card / header / panel                           | `{colors.surface-1}`                             |
| Muted fill, table header, "them" message bubble | `{colors.surface-2}`                             |
| Nested / pressed fill                           | `{colors.surface-3}`                             |
| Primary text                                    | `{colors.ink}`                                   |
| Secondary text & labels                         | `{colors.ink-muted}`                             |
| Hints, timestamps, placeholders                 | `{colors.ink-subtle}`                            |
| Borders                                         | `{colors.hairline}` / `{colors.hairline-strong}` |

### Semantic (status)

| Meaning              | Token                       | Examples in app                               |
| -------------------- | --------------------------- | --------------------------------------------- |
| Secure / verified    | `{colors.semantic-secure}`  | "Encrypted", "Device verified"                |
| Healthy / done       | `{colors.semantic-success}` | "Ready", "Synced", "Joined"                   |
| Attention / degraded | `{colors.semantic-warning}` | "Read-only", "Catching up", "Action needed"   |
| Danger / failure     | `{colors.semantic-danger}`  | Delete, "Can't be shown yet", pending invites |

Dark theme inverts canvas/surfaces via the `.dark` class (`next-themes`); semantic hues stay constant.

## 3. Typography Rules

- **One family.** System UI stack for everything (`{typography.body.fontFamily}`); monospace (`{typography.mono.fontFamily}`) is reserved for machine identifiers and diagnostics — never body copy.
- **Root is 14px.** All `em`-based headings scale from it.

| Token                     | Size  | Weight | Use                              |
| ------------------------- | ----- | ------ | -------------------------------- |
| `{typography.display}`    | 28    | 600    | Page title (one per screen)      |
| `{typography.heading}`    | 21    | 600    | Section title                    |
| `{typography.subheading}` | 17.5  | 600    | Panel header                     |
| `{typography.body}`       | 14    | 400    | Default text                     |
| `{typography.label}`      | 12.25 | 500    | Form labels, button text, badges |
| `{typography.caption}`    | 11    | 400    | Timestamps, hints, status        |
| `{typography.mono}`       | 11.9  | 400    | IDs, keys, diagnostics only      |

Principles: sentence case for everything (no ALL CAPS); numbers and IDs in mono; never exceed one `display` per screen; truncate long identifiers with ellipsis + copy affordance rather than wrapping.

## 4. Component Stylings

Components are Base UI primitives styled with Tailwind v4 tokens (`web/src/components/ui/`). Build on them; do not introduce parallel primitives.

- **Button** (`{components.button}`): variants `default` (primary, near-black), `outline`, `secondary`, `ghost`, `destructive` (soft red tint, not solid), `link`. Sizes `xs|sm|default|lg` + icon variants. Active state nudges 1px down. Use `render={<Link/>}` to render as a link. Disable + `title` tooltip when the client isn't `ready` (see §7 gating rule).
- **Badge**: status pills. Map variant to semantic color — `default` for healthy, `secondary` for neutral/idle, `destructive` for problems. Caption type, `{rounded.sm}`.
- **Input / PasswordInput / Label**: 36px height, hairline border, accent focus ring. Always pair an `Input` with a `Label htmlFor`. Secrets (recovery key, password) use `PasswordInput` with `autoComplete="off" spellCheck={false}`.
- **Card / Panel**: `{components.card}` — `{colors.surface-1}` on `{colors.hairline}`, `{rounded.md}`, 16–24px padding. Panel headers get a bottom hairline + `subheading` + `caption` description.
- **Dialog**: `{components.dialog}` — replaces all confirms (project rule: never use `confirm()`). Header (title + description) → body → right-aligned action row (`Cancel` outline, then primary/destructive). Block close while an async action is in flight.
- **DropdownMenu / Popover**: row actions and the account menu. Destructive items use the `destructive` item variant.
- **Toast** (`sonner`): the universal async-result channel. Success and error both go here — `toast.error(err instanceof Error ? err.message : String(err))`. Keep this exact pattern.
- **Table**: clinic patient list. Header on `{colors.surface-2}`; rows hover; right-align numeric/action columns; long IDs become a copy-on-click mono chip, not a column of raw text.

## 5. Layout Principles

- **4px base grid.** All spacing from the `{spacing}` scale; never arbitrary px.
- **Sidebar app shell.** A fixed `w-64` left sidebar (`{colors.surface-1}`, right hairline) holds the brand mark, role-aware nav (Dashboard, Patients for clinics), a brand-gradient security card, and a footer identity block. It collapses below `md` (brand moves into the top bar).
- **Content column.** Right of the sidebar: a sticky top bar (`{colors.surface-1}` + blur, bottom hairline) carrying status/account controls, then a `max-w-6xl` main area with `{spacing.lg}`–`{spacing.xl}` padding.
- **Role-aware rhythm:**
  - _Clinic (dense):_ tables, `{spacing.md}` gaps, compact rows, inline actions.
  - _Patient (calm):_ cards and lists, `{spacing.lg}`–`{spacing.xl}` gaps, larger touch targets, fewer elements per view.
- **Two-column detail** (`lg:grid-cols-[6fr_4fr]`): record/profile left, conversation/timeline right; stacks on mobile.
- **Empty states are first-class:** dashed-hairline card, one calming sentence, one clear next action — never a blank screen or a raw "0 results".

## 6. Depth & Elevation

Depth is minimal and functional — flat surfaces separated by hairlines, not heavy shadows.

| Level | Use               | Treatment                                             |
| ----- | ----------------- | ----------------------------------------------------- |
| 0     | Page, panels      | Flat on `{colors.hairline}`, no shadow                |
| 1     | Cards, header     | `{colors.surface-1}` + hairline, optional `shadow-sm` |
| 2     | Popover, dropdown | `shadow-md`, hairline                                 |
| 3     | Dialog            | `shadow-lg` over `{colors.semantic-overlay}` backdrop |

Never use shadow to convey status or importance — that is color and type's job.

## 7. Do's and Don'ts

**Do**

- Reserve `{colors.accent}` for primary action, focus, links, and the single secure indicator.
- Translate cryptography into plain outcomes: "Encrypted", "Locked — enter your recovery key to read history", "This message can't be shown yet".
- Put expert detail (IDs, session keys, decryption diagnostics, homeserver/identity-server fields) behind a **Details / Advanced** toggle or a "Security & devices" area.
- Gate every write action on `ready`; disable + show `notReadyMessage(notReadyReason)` as a tooltip. (Project rule: no actions before the recovery key is entered.)
- Keep the async handler shape: `setBusy(true)` → `try/await` → `toast` → `finally setBusy(false)`.
- Offer copy affordances for any identifier worth copying; truncate the rest.

**Don't**

- Don't show raw `!room:id`, `@user:server`, device/session IDs, or "Megolm/SSSS/cross-signing" as primary content.
- Don't surface the decryption-diagnostic block to patients by default — collapse it; keep "Copy diagnostic" for support.
- Don't use saturated color for healthy states, or more than one `display` heading per screen.
- Don't use `confirm()`/`alert()` — use `Dialog` + `toast`.
- Don't call `matrix-js-sdk` from the app; go through `matrix-client` / `matrix-client/react`.
- Don't let the accent leak into decoration; if unsure, use neutral.

## 8. Responsive Behavior

| Breakpoint      | Behavior                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `< 640` (sm)    | Single column; tables collapse to stacked cards; dialogs near-fullscreen; status badges wrap and may collapse into a single "Status" chip opening a sheet |
| `640–1024` (md) | Two-column forms; detail view still stacked                                                                                                               |
| `≥ 1024` (lg)   | Two-column detail (`6fr_4fr`); full table columns; account menu in header                                                                                 |

- Touch targets ≥ 40px on coarse pointers (bump `sm` buttons up on mobile).
- Long identifiers always truncate with ellipsis; never force horizontal scroll.
- The status bar degrades gracefully: on narrow screens show only `Ready` + `Secure` + any _problem_ badge; move the rest into the account/security panel.

## 9. Agent Prompt Guide

**Quick color reference:** canvas `#ffffff` · ink `#18181b` · muted `#52525b` · hairline `#e4e4e7` · primary `#18181b` · accent `#3d63dd` · success `#16a34a` · warning `#d97706` · danger `#dc2626`.

**When building UI in this repo:**

- Read this file first; use `{tokens}`, never raw hex/px. Implementation tokens live in `web/src/app/globals.css` (oklch CSS vars) and `web/src/components/ui/`.
- Determine the surface's audience (clinic = dense, patient = calm) and apply §5 rhythm.
- Re-read `AGENTS.md`: no `confirm()`, no direct `matrix-js-sdk`, gate actions on the recovery key, and for undecryptable messages show enough to diagnose (collapsed for patients).

**Ready-to-use prompts:**

- "Build the patient-side account view per DESIGN.md: calm rhythm, no raw IDs, encryption shown as a single plain-language 'Encrypted' indicator, recovery-key onboarding instead of a buried popover."
- "Refactor the StatusBar per DESIGN.md §7: collapse crypto badges into one 'Secure' indicator plus a 'Security & devices' panel; surface only problems inline."
- "Style this dialog per DESIGN.md §4: header + body + right-aligned Cancel/primary, block close while submitting."

## Iteration Guide

1. Change a token here first, then mirror it in `web/src/app/globals.css` (convert hex ↔ oklch) — keep both in sync.
2. Add new component patterns as their own entry under §4 with their interactive states.
3. Keep the accent scarce; if a new use of `{colors.accent}` appears, justify it against §7 or pick neutral.
4. Reflect copy/terminology decisions in §7 so plain-language reframing stays consistent.

## Known Gaps

- No product logo or wordmark yet (intentionally neutral); `metadata.title` is the working name "Patient Records".
- Dark theme tokens are documented at the base level only; per-component dark treatments are defined inline in `globals.css`/components.
- Recovery-key onboarding flow (first-run education) is a design target, not yet built.
