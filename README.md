# SHOWROOM by Blue — 3D product showcase

Concept project — not real products. A portfolio piece built with Next.js, TypeScript and React Three Fiber.

The home page is a 3D showroom floating in space above the Earth. Three products sit on a ring in front of the
planet. Drag, scroll or use the arrows to turn the ring; click a product to bring it to the front, then click it
again (or double-click any product) to dive into the Earth toward the product's home city and land on its page.

| # | Product | Page | 3D model |
|---|---|---|---|
| 1 | FIZZ — soft drinks, 6 cans (Coca-Cola, Coke Zero, Sprite, Pepsi, Pepsi Zero, Dr Pepper) | `/drink` | `public/models/soda` |
| 2 | SIGNAL — smartphones (iPhone 17 Pro) | `/phone` | `public/models/phone` |
| 3 | GRID 26 — 1:18 F1 scale models, 3 teams (Mercedes W17, Ferrari SF-26, Red Bull RB22) | `/f1` | `public/models/f1` |

Every product has one or more variants (a can, a team, a phone). Pick one with the colour buttons in the details
panel and the model, accent colour and the city the camera dives to all follow it.

Full plan and milestones (Thai): [PLAN.md](./PLAN.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also generates the route types tsc needs)
npm run lint
```

Controls:

| | Turn the ring | Bring a product forward | Enter its page |
|---|---|---|---|
| Desktop | drag, mouse wheel / trackpad, ‹ › at the screen edges | click it | click the front product, double-click any product, or Enter → |
| Phone | swipe, ‹ › in the panel | tap it | tap the front product or Enter → |
| Keyboard | ← → | | Enter |

## Structure

| Path | What it does |
|---|---|
| `app/page.tsx` | Home page: header and headline (server-rendered) + `<Showroom />` |
| `app/drink`, `app/phone`, `app/f1` | One route per product (placeholder pages for now) |
| `app/credits` | Credits page, generated from `config/credits.ts` |
| `components/Showroom.tsx` | Interactive state: which product is in front, drag / wheel / keyboard, the dive into the Earth |
| `components/ProductPanel.tsx` | Details panel for the front product (variant picker, specs, Enter) |
| `components/ProductIntro.tsx` | Shared placeholder product page |
| `components/three/Scene.tsx` | Canvas, lights, stars, the product ring, camera (parallax + dive) |
| `components/three/Earth.tsx` | Earth with a custom shader: day/night, city lights, clouds, atmosphere |
| `components/three/Backdrop.tsx` | Space background: deep blue with a glow above the Earth's edge |
| `components/three/FloatingProduct.tsx` | One floating product: loads its `.glb`, size/centre normalisation, hover glow, label |
| `config/site.ts` | Site name and headline |
| `config/products.ts` | Product data: name, category, tagline, specs, variants (model, colour, home city) |
| `config/credits.ts` | Authors and licences of the Earth imagery and 3D models |
| `lib/dive.ts`, `lib/format.ts` | Dive duration, coordinate formatting |
| `public/textures` | NASA Earth textures (see `CREDITS.md`) |
| `public/models` | Product `.glb` models (see `CREDITS.md`) |

## Editing

- Site name or headline: `config/site.ts`
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
