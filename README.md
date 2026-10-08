# SHOWROOM by Blue — 3D product showcase

Concept project — not real products. A portfolio piece built with Next.js, TypeScript and React Three Fiber.

The home page is a 3D showroom floating in space above the Earth. Three products orbit in front of the planet;
hover one (or swipe to it on a phone) to see its details, then click to dive into the Earth toward the
product's home city and land on its own page.

| # | Product | Page | 3D model |
|---|---|---|---|
| 1 | VOLTRA — energy drink | `/drink` | code-built placeholder |
| 2 | ORLÉ — luxury watch | `/watch` | code-built placeholder |
| 3 | GRID 26 — 1:18 F1 scale models, 3 teams (Mercedes W17, Ferrari SF-26, Red Bull RB22) | `/f1` | `.glb` files in `public/models/f1` |

A product can have variants (the F1 teams): pick one in the details panel and the model, accent colour and
the city the camera dives to (the team's factory) all follow it.

Full plan and milestones (Thai): [PLAN.md](./PLAN.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also generates the route types tsc needs)
npm run lint
```

Controls: hover / click (desktop), swipe / tap (phone), ← → and Enter (keyboard).

## Structure

| Path | What it does |
|---|---|
| `app/page.tsx` | Home page: header and headline (server-rendered) + `<Showroom />` |
| `app/drink`, `app/watch`, `app/f1` | One route per product (placeholder pages for now) |
| `components/Showroom.tsx` | Interactive state: active product, keyboard, swipe, the dive into the Earth |
| `components/ProductPanel.tsx` | Details panel at the bottom of the screen |
| `components/ProductIntro.tsx` | Shared placeholder product page |
| `components/three/Scene.tsx` | Canvas, lights, stars, product layout, camera (parallax + dive) |
| `components/three/Earth.tsx` | Earth with a custom shader: day/night, city lights, clouds, atmosphere |
| `components/three/FloatingProduct.tsx` | One floating product: loads its `.glb` (or placeholder), size/centre normalisation, hover, label |
| `components/three/placeholders.tsx` | Code-built stand-in models until the real ones arrive |
| `config/site.ts` | Site name and headline |
| `config/products.ts` | Product data: name, category, tagline, accent colour, specs, home city, variants |
| `lib/dive.ts`, `lib/format.ts` | Dive duration, coordinate formatting |
| `public/textures` | NASA Earth textures (see `CREDITS.md`) |
| `public/models` | Product `.glb` models (see `CREDITS.md`) |

## Editing

- Site name or headline: `config/site.ts`
- Product name, specs, colour or the city the camera dives to: `config/products.ts`
- A product's variants (model file, colour, home city): `variants` in `config/products.ts`

## Adding a 3D model

1. Compress it for the web (the F1 models went from ~31 MB to ~3.9 MB each this way):
   ```bash
   npx @gltf-transform/cli optimize input.glb public/models/name.glb --texture-compress webp --texture-size 2048
   ```
2. Point a variant's `model` at it in `config/products.ts`.
3. Add the author and licence to `public/models/CREDITS.md`.

`FloatingProduct` scales and centres any model to the same size, so the file's own units and origin don't matter.

## Credits

Earth imagery: NASA Earth Observatory (Blue Marble, Black Marble) — public domain.
F1 car models: Dave Love on Sketchfab, CC BY 4.0, compressed for the web — details in `public/models/CREDITS.md`.
The F1 collection is a fan concept and is not affiliated with Formula 1 or any team.
