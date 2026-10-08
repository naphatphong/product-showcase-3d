# SHOWROOM by Blue — 3D product showcase

Concept project — not real products. A portfolio piece built with Next.js, TypeScript and React Three Fiber.

The home page is a 3D showroom in orbit, styled after [edolus.com](https://edolus.com): a loading screen with the
real load percentage opens onto a close-up of the Earth's horizon with a big headline and an **Enter orbit** button.
After that the products orbit the planet like satellites, one at a time: the first one flies in from the top-right
corner, and dragging, scrolling or the arrows send it on along the orbit while the next one slides in (it loops
forever). Click the product (or **Enter**) to dive into the Earth toward the product's home city and land on its
page. Optional synthesized sound and a lens flare from the sun complete the scene.

| # | Product | Page | 3D model |
|---|---|---|---|
| 1 | FIZZ — soft drinks, 6 cans (Coca-Cola, Coke Zero, Sprite, Pepsi, Pepsi Zero, Dr Pepper) — full scroll page | `/drink` | `public/models/soda` |
| 2 | SIGNAL — smartphones (iPhone 17 Pro) | `/phone` | `public/models/phone` |
| 3 | GRID 26 — 1:18 F1 scale models, 3 teams (Mercedes W17, Ferrari SF-26, Red Bull RB22) | `/f1` | `public/models/f1` |

Every product has one or more variants (a can, a team, a phone). Pick one with the colour buttons under the product
name and the model, accent colour and the city the camera dives to all follow it. The FIZZ page opens on the same can.

Full plan and milestones (Thai): [PLAN.md](./PLAN.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also generates the route types tsc needs)
npm run lint
```

Controls on the home page:

| | Leave the intro | Next / previous product | Enter its page |
|---|---|---|---|
| Desktop | Enter orbit, scroll down | drag, mouse wheel / trackpad, ‹ › at the screen edges | click the product or Enter … → |
| Phone | Enter orbit, swipe up | swipe, ‹ › next to the Enter button | tap the product or Enter … → |
| Keyboard | Enter, Space, ↓, → | ← → | Enter |

Sound is off until you turn it on (top right, or "Experience with sound" on the intro). Once you are past the intro,
coming back to the home page in the same tab skips it.

## Structure

| Path | What it does |
|---|---|
| `app/page.tsx` | Home page: logo, intro headline and product links (server-rendered) + `<Showroom />` |
| `app/drink` | FIZZ: full scroll page (`components/fizz`) |
| `app/phone`, `app/f1` | SIGNAL and GRID 26 (placeholder pages for now) |
| `app/credits` | Credits page, generated from `config/credits.ts` |
| `components/Showroom.tsx` | Home state: loader → intro → orbit, drag / wheel / keyboard, sound, the dive into the Earth |
| `components/OrbitLoader.tsx` | Loading screen: real %, then the black opens in two bands and the logo docks in the header |
| `components/OrbitPanel.tsx` | HUD-style details for the product in view (name, specs, variant picker, Enter, home city) |
| `components/Reveal.tsx`, `components/fonts.ts` | Letter-by-letter reveal; shared fonts (Archivo, IBM Plex Mono) |
| `components/ProductIntro.tsx` | Shared placeholder product page |
| `components/three/Scene.tsx` | Canvas, lights, stars, the orbit of products, camera (intro → orbit, parallax, dive), load progress |
| `components/three/Earth.tsx` | Earth with a custom shader: day/night, city lights, clouds (bicubic), atmosphere |
| `components/three/Backdrop.tsx` | Space background: deep blue, blue haze hugging the Earth's edge, warm light toward the sun |
| `components/three/LensFlare.tsx` | Screen-space lens flare from the sun (glow, ghosts, rainbow arc), hidden when the Earth blocks it |
| `components/three/FloatingProduct.tsx` | One floating product: loads its `.glb`, size/centre normalisation, hover glow, HUD label |
| `components/fizz/` | FIZZ page: Lenis scroll paging, 3D cans on a scroll timeline, bubbles, HUD, loader, FAQ |
| `config/site.ts` | Site name, headline, intro text |
| `config/products.ts` | Product data: name, category, tagline, specs, variants (model, colour, home city) |
| `config/fizz.ts` | FIZZ copy: brand stories, soda facts, FAQ |
| `config/credits.ts` | Authors and licences of the Earth imagery and 3D models |
| `lib/orbitSound.ts`, `lib/fizzSound.ts`, `lib/synth.ts` | Web Audio sound for each page + shared synth pieces |
| `lib/dive.ts`, `lib/format.ts`, `lib/useNarrow.ts` | Dive duration, coordinate formatting, phone-width check |
| `public/textures` | NASA Earth textures (see `CREDITS.md`) |
| `public/models` | Product `.glb` models (see `CREDITS.md`) |

## Editing

- Site name, headline or intro text: `config/site.ts`
- Where the Earth sits, the sun direction: `components/three/Earth.tsx`; camera views, orbit path: `components/three/Scene.tsx`
- Product name, specs or tagline: `config/products.ts`
- A product's variants (model file, colour, colour button, home city): `variants` in `config/products.ts`

## Adding a 3D model

1. Compress it for the web (the F1 models went from ~31 MB to ~3.9 MB each this way):
   ```bash
   npx @gltf-transform/cli optimize input.glb public/models/name.glb --texture-compress webp --texture-size 2048
   ```
   If one file holds several products (the soda model has all six cans), split it into one file per product
   first, so the page only downloads the one on screen.
2. Add a variant pointing at it in `config/products.ts`.
3. Add the author and licence to `config/credits.ts` (shown on `/credits`) and `public/models/CREDITS.md`.

`FloatingProduct` scales and centres any model to the same size, so the file's own units and origin don't matter.

## Credits

Earth imagery: NASA Earth Observatory (Blue Marble, Black Marble) — public domain.
F1 car models: Dave Love, CC BY 4.0. Soda cans: Mark Peters, CC BY-NC 4.0. iPhone 17 Pro: zhe_kan, CC BY-NC-SA 4.0.
All were compressed for the web — details on the site's `/credits` page and in `public/models/CREDITS.md`.

Brand names, logos and liveries belong to their owners. This is a non-commercial fan concept and is not affiliated
with Formula 1 or any team, The Coca-Cola Company, PepsiCo, Keurig Dr Pepper or Apple.
