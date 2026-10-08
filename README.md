# SHOWROOM by Blue — 3D product showcase

Concept project — not real products. A portfolio piece built with Next.js, TypeScript and React Three Fiber.

The home page is a 3D showroom floating in space above the Earth. Three products orbit in front of the planet;
hover one (or swipe to it on a phone) to see its details, then click to dive into the Earth toward the
product's home city and land on its own page.

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
| `app/drink`, `app/watch`, `app/car` | One route per product (placeholder pages for now) |
| `components/Showroom.tsx` | Interactive state: active product, keyboard, swipe, the dive into the Earth |
| `components/ProductPanel.tsx` | Details panel at the bottom of the screen |
| `components/ProductIntro.tsx` | Shared placeholder product page |
| `components/three/Scene.tsx` | Canvas, lights, stars, product layout, camera (parallax + dive) |
| `components/three/Earth.tsx` | Earth with a custom shader: day/night, city lights, clouds, atmosphere |
| `components/three/FloatingProduct.tsx` | One floating product: size/centre normalisation, hover, label |
| `components/three/placeholders.tsx` | Code-built stand-in models until the real ones arrive |
| `config/site.ts` | Site name and headline |
| `config/products.ts` | Product data: name, category, tagline, accent colour, specs, home city |
| `lib/dive.ts`, `lib/format.ts` | Dive duration, coordinate formatting |
| `public/textures` | NASA Earth textures (see `CREDITS.md`) |

## Editing

- Site name or headline: `config/site.ts`
- Product name, specs, colour or the city the camera dives to: `config/products.ts`

## Real 3D models

The products are placeholders for now. Real models should be `.glb` files (textures embedded, Y up, front facing +Z,
up to ~10 MB). They go in `public/models/`; `FloatingProduct` already scales and centres any model to the same size.

## Credits

Earth imagery: NASA Earth Observatory (Blue Marble, Black Marble) — public domain.
The car page is a fan concept and is not affiliated with or endorsed by Nissan.
