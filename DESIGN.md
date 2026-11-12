# Falaj design system

This is a refinement of the existing Falaj identity, not a replacement product or a new application flow. Water blue identifies actions and the care channel, navy anchors important surfaces, palm green marks completion, amber signals attention, and red is reserved for overdue or error states. Labels remain present alongside status colours.

## Sources and ownership

- `design/tokens.css` owns the shared font faces, semantic colour aliases, spacing, radii, depth and motion tokens.
- `design/system.css` owns repeated visual patterns: typography, buttons, forms, status badges, table rhythm, navigation, grouped rows, sheets and the care-channel presentation.
- `styles.css`, `ios.css`, `theme.css` and `app-shell.css` retain the existing structural layouts and screen-specific components. Their repeated root token declarations have been consolidated into the shared token file.
- All 20 HTML entry points load `design/system.css` last. `data-falaj-surface` scopes the rendering context; `data-falaj-page` limits screen-specific refinements. These attributes never select a clinical workflow or application route.

## Surface modes

| Surface | Mode | Design priority |
| --- | --- | --- |
| Homepage | Persuade | Explain Falaj, enter the app, or watch the story; use the existing falaj illustration and claims. |
| Patient app, patient steps, legacy patient portal, family helper | Operate | Keep the restored information order and features, readable controls and clear feedback. The Health ID and QR stay prominent in the app. |
| Care-team app, desktop care-team site, staff dashboard | Operate | Scan patients, distinguish status and urgency, and retain every clinical action and permission. |
| Living map and channel map | Operate / Read | Make the existing case-derived care flow readable without changing counts, geometry or rules. |
| Jury, impact, pilot, safety and clinical review | Read | Consistent navigation and readable text, tables and evidence. |
| Verification | Operate | Clear form, valid/invalid outcomes and visible focus. |
| Guided story and opening animation | Experience | Preserve the story and its progression; support reduced motion. |

## Type and colour

Inter (`FalajText`) is the interface and reading face; Bricolage Grotesque (`FalajDisplay`) is the headline face. IBM Plex Sans Arabic (`FalajArabic`) supplies Arabic glyphs and reading rhythm. Every font is served from the existing local `fonts/` directory. No font service or third-party script is introduced.

Use `--text` and `--display`, not a new font name on individual pages. Clinical numbers, identifiers, dates and counts use tabular numerals. Arabic headings use normal tracking, and spacing follows logical inline/block directions.

The patient surfaces retain a warm canvas (`--app-bg`). Website and staff surfaces use a cool neutral canvas (`--bg`). Both share the same action, text, surface and status tokens. Dark mode has its own legible text/surface/status pairs instead of inheriting light-theme values.

Use `--brand` with `--on-action` for the common `.btn`. The existing `.wide` family retains a dark primary fill; `.go` means the existing patient action, not an additional approval. A disabled control uses `--card2`, `--muted` and no hover elevation. Never infer clinical priority from an action-button colour.

## Shared patterns

Repeated components retain their existing semantic HTML, IDs, handlers, labels, roles and state attributes. Shared style rules match the existing `.btn`, `.wide`, `.field`, `.chip`, `.st`, `.sla`, `.phase`, `.card`, `.list`, `.sheet` and `.tbl` families rather than introducing parallel implementations.

Related controls have tight spacing; separate groups have more space. Surfaces use thin borders and offset, soft shadows. Tables retain their existing scrolling and stacking behaviour. Focus uses a visible 3px ring. Placeholder contrast, text selection, caret colour and scrollbar colours belong to the same palette.

Website navigation links to Home, Patient app, Care team and Evidence. It is added to the existing header without changing the application entry routes, content claims or role selection.

## Motion

| Pattern | Purpose | Shared treatment |
| --- | --- | --- |
| Existing care-channel water | Explain continuity and progress | Retain the existing SVG animation; use a calm 1800ms flow cycle. It does not imply automated clinical action. |
| Current checkpoint | Locate the next step | Keep the existing visible outline/status; remove competing pulse effects in the shared workflow and channel components. |
| Newly added clinical record | Help the viewer locate the addition | A single 420ms outline-softening highlight; preserve its position. |
| Bottom sheet | Show a temporary focused layer | A 240ms, 18px rise with restrained opacity/clip change. Content remains visible by default. |
| Buttons and inputs | Acknowledge interaction | 140ms colour/depth changes; no generic section entrances. |
| Incoming call | Signal an incoming simulated call | Retain the existing call-specific behaviour. |

The default easing is `cubic-bezier(.16,1,.3,1)`. `prefers-reduced-motion: reduce` removes the nonessential displacement, pulsing and continuous animation while retaining the final state and all controls. These values are authored design choices, not claims of externally benchmarked motion.

## Scope boundary

This extraction changes visual presentation only. Application scripts, case rules, thresholds, deadlines, role permissions, consent, AI providers, data storage, copy and state transitions are preserved. The service-worker cache version is updated so the new local styles can be cached by the existing offline strategy.

## Verification

The local review covered all 20 entry points at desktop (1440px) and mobile (390px), Arabic patient steps, and the three dense review/clinical pages at 320px: 44 route/viewport combinations with no document-level horizontal overflow. Light and dark semantic text/action/status pairs passed the measured 4.5:1 contrast threshold across 18 combinations. This is a token-level check, not a claim of complete WCAG conformance.

Keyboard navigation showed the shared 3px focus ring. The sheet transition measured 240ms and reduced to effectively zero under reduced-motion settings. No browser exceptions or missing assets were recorded. Unit tests and the complete existing browser regression suite passed. Inline application scripts match their pre-extraction hashes.

## The app refresh: "Calm, luminous clinic"

Still and readable; light through glass and water; motion only where something is happening. The app (`app.html`) and the patient steps (`me.html`) share `design/glass.css`; the steps component lives in `core/steps.mjs`.

| Rule | Value |
| --- | --- |
| One accent | The water scale `--water-50` to `--water-900` (`design/tokens.css`). Actions use `--water-600` (`--water-700` for text on light). No second blue. |
| Status | `--care-ok` done, `--care-wait` waiting for a person, `--care-late` late. Amber never decorates. |
| Radius | Three sizes plus pill: `--r-ctl` 12px controls, `--r-card` 20px cards, `--r-hero` 28px hero cards and the Health ID pass. Nested shapes take the outer radius minus the padding. |
| Depth | Glass shows depth with its edge and a specular top line, plus one soft shadow tinted toward water blue (`--glass-shadow`). No grey drop shadows on glass. Dark mode uses tonal surfaces. |
| Icon tiles | Tonal: a pale tint behind a coloured glyph. Blue for information, green only for calling. |
| Icons | One line style, 2px stroke, round caps and joins. |
| Pulsing dot | Only when something waits for a person ("A nurse will call you"). Never as decoration. |
| Motion | `--ease-out` for entrances, `--ease-spring` for the tab highlight. Everything stops under "Reduce motion". |
| Website | The main button uses the app's water blue; amber is reserved for attention. |

## The signature: what makes Falaj look like Falaj

Generic health apps are blue, white and glass. Falaj owns four things no other product has; use them, and nothing else, for character.

| Asset | Where | Rule |
| --- | --- | --- |
| **The falaj line** (`falajHtml` in `core/steps.mjs`) | The app's Today card | A channel with one shaft per step. Water reaches the current step. The palm at the end grows a frond per finished step and bears dates only when care is confirmed. Always computed from the real case. |
| **The falaj in cross-section** (`falajHero` in `core/art.mjs`) | The home page hero | Mountain and mother well (the result), tunnel and shafts (the checkpoints), palm garden (care). Its numbers match the steps written below it. |
| **The shaft motif** (`.shafts`, `.chan`) | Section breaks and step lists on the website | A falaj seen from above is a line of shafts. Steps sit along one channel; never as identical cards. |
| **The oasis palette** | Everywhere | Warm sand canvas, water blue for action, palm green for done, date amber only on the palm and for "waiting". No lavender, no grey canvas. |

Type: Bricolage Grotesque (bundled) for titles on the website and for the app's large titles; the system font for everything a person reads or taps. Product screenshots on the website are real captures (`media/app-*.webp`), never drawn mock-ups.

## Glass, everywhere (`design/glass-all.css`)

One theme for every page: a luminous water backdrop (water blue, aqua, a warm sand glow) that drifts slowly, and every surface made of frosted glass with a bright edge: cards, lists, bars, sheets, the care team sidebar (dark glass), fields and quiet buttons. Solid colour is kept for the main action and for status only, so they stand out. Sheets use the stronger glass (`--glass-strong`) so words stay easy to read. Dark mode uses dark glass over a deep-water backdrop. The drift stops under "Reduce motion".
