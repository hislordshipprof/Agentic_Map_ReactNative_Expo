# Onboarding redesign plan

Adapt the existing onboarding flow (`welcome` → `features` → `ready`) to match the 3 provided designs: dark theme, glassmorphism, and smooth animations. The flow clearly explains what the app does: **plain-language route planning, optimized stops, and the full journey at a glance.**

---

## 1. Screen order and routing

| Current file   | New theme (from images)     | CTA              | Content focus                          |
|----------------|-----------------------------|------------------|----------------------------------------|
| `welcome.tsx`  | **Just Say Where**          | Next >           | Voice/plain-English input, no menus    |
| `features.tsx` | **Optimized Stops**         | Next >           | Smart optimization, less detour, -12 min |
| `ready.tsx`    | **Navigate with Ease**      | Get Started →    | Journey at a glance, Your Journey card |

Routing stays: `welcome` → `features` → `ready` → `(tabs)`.

---

## 2. Shared shell (all 3 screens)

- **Background**: `Colors.dark.background` (`#0F1419`).
- **SafeAreaView**: `edges={['top','bottom']}`, dark background.
- **Skip** (top-right):  
  - Text: "Skip", `Colors.dark.text.secondary`.  
  - `onPress`: `AsyncStorage.setItem(ONBOARDING_KEY,'true')` then `router.replace('/(tabs)')`.  
  - `accessibilityLabel="Skip onboarding"`.
- **Pagination** (bottom-left):  
  - 3 dots; active = teal/blue, inactive = `Colors.dark.text.tertiary`.  
  - `welcome` → dot 1; `features` → dot 2; `ready` → dot 3.
- **Primary CTA** (bottom-right):  
  - "Next >" on `welcome` and `features`; "Get Started" + arrow on `ready`.  
  - Teal/blue gradient (`Colors.primary.teal` → `tealDark` or `Colors.gradients.primary`), white text.  
  - `onPress`: `router.push` to next screen, or on `ready`: set `ONBOARDING_KEY` and `router.replace('/(tabs)')`.  
  - Press: `withSpring(0.96)` scale; use `Animated.createAnimatedComponent(Pressable)` or existing pattern.
- **Typography**: `FontFamily.primary`, `FontSize`, `Colors.dark.text.primary | secondary | tertiary`.
- **Cards**: `GlassCard` or `View` with `Colors.effects.glassDark`, `Colors.effects.glassDarkBorder`, `Layout.radiusLarge` / `BorderRadius.lg`.

Reusable snippet: **OnboardingShell**  
- Props: `step (1|2|3)`, `title`, `subtitle`, `children` (main block), `ctaLabel` ("Next >" | "Get Started"), `ctaIcon?` (e.g. arrow), `onNext`, `onSkip`.  
- Renders: SafeAreaView, Skip, title, subtitle, `children`, footer (pagination + CTA).  
- Or: keep each screen self-contained and extract only重复的 JSX (Skip, pagination, CTA) into small subcomponents.

---

## 3. Screen 1 – `welcome` (Just Say Where)

### 3.1 Content (from image)

- **Title**: "Just Say Where"
- **Subtitle**:  
  - "Tell us your destination in plain English"  
  - "No more tapping through menus."
- **Central graphic**: Chat bubble icon in the center of **pulsating concentric circles** (2–3 rings, blue/teal, semi‑transparent).
- **Floating icon**: Small circular **location pin** to the right of the subtitle, with subtle glow.
- **Example card**:  
  - "Take me home with stops at Starbucks and Walmart"  
  - **Microphone** button on the right (primary input hint).
- **Quick chips**: "Home", "Work", "Grocery store" (non‑functional in onboarding; for show).
- **Footer**: Dot 1 active, "Next >".

### 3.2 Layout and components

- **PulsatingRings** (new, or inline):  
  - 2–3 `Animated.View` rings around the chat icon.  
  - `withRepeat(withSequence(withTiming(scale 1.2, opacity 0.5), withTiming(scale 1, opacity 0.2))`, -1, false) or similar.  
  - Slight `withDelay` per ring for stagger.
- **Chat icon**: `Ionicons` `chatbubble-outline` (or `chatbubbles-outline``), large, e.g. 64, `Colors.primary.teal` or `tealLight`.
- **Floating location**: `Pressable` + `Ionicons` `location-outline`, `Colors.primary.teal`, small pulse (optional `withRepeat` opacity).
- **Example card**: `GlassCard` or `View` with `glassDark`; `Text` for the example; `Pressable` + `Ionicons` `mic-outline` on the right. Chips: `ActionChip` with `variant="suggested"` or custom style to match `Colors.chips.suggested` / `Colors.primary.teal` tint.

### 3.3 Animations

- **Enter**:  
  - Rings + icon: `FadeIn` + light `scale` (e.g. 0.9 → 1) `duration(500)`.  
  - Title: `FadeInDown.duration(400).delay(100)`.  
  - Subtitle: `FadeInDown.duration(400).delay(180)`.  
  - Example card: `FadeInUp.duration(400).delay(260)`.  
  - Chips: `FadeInUp.duration(350).delay(340)`.  
  - Footer: `FadeIn.duration(300).delay(400)`.
- **Continuous**: Pulsating rings; optional subtle pulse on location and mic (opacity 0.8 ↔ 1).

---

## 4. Screen 2 – `features` (Optimized Stops)

### 4.1 Content (from image)

- **Badge**: "Smart Optimization" with lightning icon, green background (`Colors.semantic.success` or `status.noDetour`).
- **Title**: "Optimized Stops"
- **Subtitle**: "We find the best locations on your route. Less detours, more time saved."
- **Route diagram**:  
  - Horizontal line as the “route”.  
  - **Nodes**: Start (blue) → Starbucks (green, `cafe-outline`) → Walmart (orange, `cart-outline`) → End (purple).  
  - Segment colors: e.g. blue, green, blue (or as in image).
- **Route Optimized card**:  
  - Left: lightning (green) + "Route Optimized", "3 stops • Minimal detour".  
  - Right: **"-12 min"** (green, bold).  
  - **Progress bars**: grey bar "Original: 45 min"; green bar "Optimized: 33 min" (green bar shorter).
- **Footer**: Dot 2 active, "Next >".

### 4.2 Layout and components

- **Badge**: `View` with green bg, `Ionicons` `flash`, `Text` "Smart Optimization", `BorderRadius.full`, padding.
- **Route diagram**:  
  - One `View` for the horizontal line (height 3–4, `Colors.primary.blue` / `teal`).  
  - Nodes as `View` + `Ionicons`; colors: blue `#2563EB`, green `#10B981`, orange `#F59E0B`, purple `#A855F7` (or from `Colors`).  
  - Labels under: "Starbucks", "Walmart" (start/end can be unlabeled or "Start"/"End").
- **Route Optimized card**: `GlassCard`.  
  - Two rows: (lightning + "Route Optimized" | "-12 min"); ("3 stops • Minimal detour" | empty).  
  - **Progress**: two `View`s (grey, green); green width = (33/45) of a fixed width. Animate width on mount with `withTiming` or `withSpring`.

### 4.3 Animations

- **Enter**:  
  - Badge: `FadeInDown.duration(350).delay(80)`.  
  - Title: `FadeInDown.duration(400).delay(140)`.  
  - Subtitle: `FadeInDown.duration(400).delay(220)`.  
  - Route diagram: `FadeIn.duration(450).delay(300)`; optional: nodes `FadeIn` with 60ms stagger.  
  - Route Optimized card: `FadeInUp.duration(400).delay(380)`; progress bars: width 0 → target in ~400ms.  
  - Footer: `FadeIn.duration(300).delay(480)`.

---

## 5. Screen 3 – `ready` (Navigate with Ease)

### 5.1 Content (from image)

- **Title**: "Navigate with Ease"
- **Subtitle**:  
  - "See your entire journey at a glance."  
  - "Every stop, perfectly planned."
- **Central card**:  
  - **Grid** background ( subtle grid lines or gradient).  
  - **Blue path** (thick line) with **4 numbered markers**: 1 (light blue, paper airplane), 2 (green), 3 (orange), 4 (purple). Optional glow on markers.
- **Bottom card**:  
  - Left: route icon, **"Your Journey"**, "22 min" (clock), "4 stops", "miles".  
  - Right: **Get Started** button with arrow.
- **Footer**: Dot 3 active; no separate Next (CTA = Get Started).
- **Get Started** `onPress`: `AsyncStorage.setItem(ONBOARDING_KEY,'true')` then `router.replace('/(tabs)')`.

### 5.2 Layout and components

- **Central card**: `GlassCard` or `View` with `glassDark`, large.  
  - **Grid**: `View` with many small `View`s (e.g. 8×8) or a `LinearGradient` + overlay; or a very light grid via `borderWidth` / lines.  
  - **Path**: Absolute-positioned `View` (or simple `Svg` `Line`/`Polyline`) from coords for 4 points; stroke `Colors.primary.teal` or `blue`, 4–6pt.  
  - **Markers**: 4 `View`s + `Text` (1–4) + `Ionicons` `paper-plane` for 1; colors: light blue, green, orange, purple. Optional: `shadow` / `elevation` or extra `View` with `Colors.effects.glowTeal` and opacity for glow.
- **Bottom card**: `GlassCard` or `View`, `FadeInUp`/`SlideInUp`.  
  - Left: `Ionicons` `map` or `navigate`, "Your Journey", "22 min", "4 stops", "miles".  
  - Right: **Get Started** `Pressable` with gradient bg, "Get Started", `Ionicons` `arrow-forward`.

### 5.3 Animations

- **Enter**:  
  - Title: `FadeInDown.duration(400).delay(60)`.  
  - Subtitle: `FadeInDown.duration(400).delay(140)`.  
  - Central card: `FadeIn.duration(500).delay(220)`; path: optional draw (e.g. `strokeDashoffset` or opacity) ~400ms; markers: `FadeIn` + light scale, 80ms stagger.  
  - Bottom card: `FadeInUp` or `SlideInUp.springify().damping(18).delay(400)`.  
  - Footer (pagination only): `FadeIn.duration(300).delay(480)`.

---

## 6. Shared constants and wiring

- **ONBOARDING_KEY**: `'@agentic_map:onboarding_complete'` (reuse from `app/index` or `ready`; one source of truth).
- **Skip**: Same logic in all 3: `AsyncStorage.setItem(ONBOARDING_KEY,'true')` then `router.replace('/(tabs)')`.
- **Next**: `welcome` → `router.push('/onboarding/features')`; `features` → `router.push('/onboarding/ready')`.
- **Get Started**: `ready` only; same persistence as Skip, then `router.replace('/(tabs)')`.

---

## 7. New or reused components

| Component          | Role                                       | Where used   |
|--------------------|--------------------------------------------|-------------|
| **OnboardingShell** (optional) | Skip, title, subtitle, `children`, pagination, CTA | All 3       |
| **PulsatingRings** | Rings + centered child (chat icon)         | `welcome`   |
| **RouteDiagram**   | Horizontal line + nodes + labels           | `features`  |
| **RouteGridCard**  | Grid + path + 4 markers                    | `ready`     |
| **GlassCard**      | Cards for example, Route Optimized, journey| All 3       |
| **ActionChip**     | Home, Work, Grocery store                  | `welcome`   |

- `PulsatingRings`, `RouteDiagram`, `RouteGridCard` can live in `src/components/Onboarding/` and be imported by the 3 screens, or inlined first and extracted later.

---

## 8. Theme and design tokens

- **Background**: `Colors.dark.background`
- **Text**: `Colors.dark.text.primary | secondary | tertiary`
- **Cards**: `Colors.effects.glassDark`, `Colors.effects.glassDarkBorder`
- **Primary/teal**: `Colors.primary.teal`, `Colors.primary.tealLight`, `Colors.primary.tealDark`
- **Accents**: green `Colors.semantic.success` / `status.noDetour`; orange `Colors.semantic.warning`; purple `#A855F7` or `Colors.primary.darkBlue` if we avoid adding; blue `Colors.primary.blue`
- **Typography**: `FontFamily.primary`, `FontSize.xl | '2xl' | '3xl'`, `FontWeight.bold | semibold`
- **Spacing**: `Spacing.lg | xl | '2xl'`
- **Radius**: `Layout.radiusLarge`, `BorderRadius.lg | xl`
- **Animations**: `FadeIn`, `FadeInDown`, `FadeInUp`, `SlideInUp`, `withRepeat`, `withSequence`, `withTiming`, `withSpring`, `withDelay` from `react-native-reanimated`; `SpringConfig`, `TimingConfig` from `@/theme/animations`

---

## 9. Onboarding `_layout.tsx`

- Keep `Stack`, `headerShown: false`, `animation: 'slide_from_right'` (or `'fade'`).
- Option: set `screenOptions.contentStyle={{ backgroundColor: Colors.dark.background }}` so the underlying stack is dark during transitions.

---

## 10. Index and loading

- `app/index.tsx`: keep `ONBOARDING_KEY` and redirect logic. Loading spinner can use `Colors.primary.teal` to match onboarding.

---

## 11. Implementation order

1. **Shared shell and tokens**  
   - Ensure `BorderRadius` (and any needed `Colors`) are available.  
   - Add `OnboardingShell` or at least shared `Skip` + `PaginationDots` + `OnboardingCta` if we extract.

2. **`welcome` (Just Say Where)**  
   - PulsatingRings + chat icon, title, subtitle, location pin, example card, chips, footer.  
   - Wire Skip and Next.  
   - Staggered enter + pulsating loop.

3. **`features` (Optimized Stops)**  
   - Badge, title, subtitle, RouteDiagram, Route Optimized card with progress.  
   - Wire Skip and Next.  
   - Staggered enter + progress bar animation.

4. **`ready` (Navigate with Ease)**  
   - Title, subtitle, RouteGridCard, Your Journey card, Get Started.  
   - Wire Skip and Get Started.  
   - Staggered enter + path/marker and bottom card animations.

5. **`_layout` and polish**  
   - `contentStyle` for `Colors.dark.background`, any transition tweaks.  
   - Accessibility on Skip, CTAs, and key elements.

---

## 12. Accessibility

- Skip: `accessibilityLabel="Skip onboarding"`, `accessibilityRole="button"`.
- Next / Get Started: `accessibilityLabel="Next"` / `"Get started"`, `accessibilityRole="button"`.
- Chips (welcome): `accessibilityLabel` with chip text; `accessibilityRole="button"` if we ever make them pressable.
- Pagination: `accessibilityLabel="Step N of 3"` on the dots container or the active dot.

---

## 13. Copy summary

| Screen | Title              | Subtitle line 1                                  | Subtitle line 2                 |
|--------|--------------------|--------------------------------------------------|---------------------------------|
| 1      | Just Say Where     | Tell us your destination in plain English        | No more tapping through menus.  |
| 2      | Optimized Stops    | We find the best locations on your route.        | Less detours, more time saved.  |
| 3      | Navigate with Ease | See your entire journey at a glance.             | Every stop, perfectly planned.  |

| Screen | Example / Card text                                                    |
|--------|-----------------------------------------------------------------------|
| 1      | "Take me home with stops at Starbucks and Walmart"                    |
| 2      | "Route Optimized"; "3 stops • Minimal detour"; "-12 min"; "Original: 45 min" / "Optimized: 33 min" |
| 3      | "Your Journey"; "22 min"; "4 stops"; "miles"                          |

---

## 14. Out of scope (for this plan)

- Making chips or example card interactive (e.g. mic, location) in onboarding; they are visual only.
- Localization.
- A/B or analytics hooks (can be added later where we call `onNext` / `onSkip` / Get Started).
