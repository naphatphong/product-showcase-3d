# VOLTRA — 3D energy drink landing page

Concept project — not a real product. Portfolio piece built with Next.js, TypeScript and React Three Fiber.
Full plan and milestones (Thai): [PLAN.md](./PLAN.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also generates the route types tsc needs)
npm run lint
```

## Structure

- `app/page.tsx` — page content (HTML on top of the 3D canvas)
- `app/layout.tsx` — fonts and page metadata
- `app/globals.css` — theme colors as CSS variables
- `components/three/Scene.tsx` — full-screen fixed `<Canvas>` behind the page
- `components/three/SceneLoader.tsx` — loads the scene in the browser only (`ssr: false`)
- `config/brand.ts` — brand name and tagline; change them here only

## Deploy

Import this repo on Vercel; the defaults for Next.js work as is.
