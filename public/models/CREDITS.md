# 3D model credits

| File | Model | Author | Source | License |
|---|---|---|---|---|
| `f1/mercedes-w17.glb` | 2026 Mercedes W17 | Dave Love ([Tyler_Dave](https://sketchfab.com/Tyler_Dave)) | [Sketchfab](https://sketchfab.com/3d-models/2026-mercedes-w17-b806f1e70aa343219e7158169549b97b) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| `f1/ferrari-sf26.glb` | 2026 Ferrari SF-26 | Dave Love ([Tyler_Dave](https://sketchfab.com/Tyler_Dave)) | [Sketchfab](https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| `f1/redbull-rb22.glb` | 2026 Redbull RB22 | Dave Love ([Tyler_Dave](https://sketchfab.com/Tyler_Dave)) | [Sketchfab](https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| `soda/*.glb` (6 files: coca-cola, coca-cola-zero, sprite, pepsi, pepsi-zero, dr-pepper) | Soda Cans - 500ml \| Free Download | Mark Peters ([mark-peters](https://sketchfab.com/mark-peters)) | [Sketchfab](https://sketchfab.com/3d-models/soda-cans-500ml-free-download-84452c6420a44ea4be84c49fc6b2df6c) | [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) |

Changes made: compressed for the web with [glTF Transform](https://gltf-transform.dev) 4.5
(`optimize --texture-compress webp --texture-size 2048`: WebP textures up to 2048 px, meshopt geometry
compression, light mesh simplification). The F1 files went from ~31 MB to ~3.9 MB each.
The soda model holds all six cans in one 14 MB file; it was first split into one file per can (keeping only
that can's node, then pruning unused data), then compressed the same way: ~2.2 MB → ~250 KB per can.

The soda cans are CC BY-NC (non-commercial): they are used here only in a non-commercial portfolio.

Team names, liveries, brand names and logos belong to their owners. This is a non-commercial fan concept and
is not affiliated with or endorsed by Formula 1, Mercedes-AMG Petronas F1, Scuderia Ferrari, Oracle Red Bull Racing,
The Coca-Cola Company, PepsiCo or Keurig Dr Pepper.
