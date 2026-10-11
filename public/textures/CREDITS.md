# Earth textures

All images are NASA imagery (public domain) unless noted below, resized and converted to WebP for the web.
Day, night and clouds come in two sizes: `-8k` (8192×4096) for desktop, and 4096×2048 for phones and GPUs
that can't take an 8192-wide texture.

| File | Source |
|---|---|
| `earth-day-8k.webp`, `earth-day.webp` | NASA Earth Observatory — Blue Marble Next Generation, July 2004 (`world.200407.3x21600x10800.jpg`), resized to 8192×4096 / 4096×2048 |
| `earth-night-8k.webp`, `earth-night.webp` | NASA Earth Observatory — Black Marble 2016 (`BlackMarble_2016_3km.jpg`, 13500×6750), resized to 8192×4096 / 4096×2048 |
| `earth-clouds-8k.webp`, `earth-clouds.webp` | NASA Earth Observatory — Blue Marble clouds (`cloud_combined_8192.tif`), full size 8192×4096 / resized to 4096×2048, greyscale |
| `earth-relief-8k.webp`, `earth-relief.webp` | NASA Visible Earth — Topography (`gebco_08_rev_elev_21600x10800.png`, https://visibleearth.nasa.gov/images/73934/topography), turned into slopes (R, G) + ocean mask (B) by `scripts/earth/build-relief.py` |
| `cities/*.webp` | Sentinel-2 cloudless 2016 by EOX IT Services GmbH (https://s2maps.eu), contains modified Copernicus Sentinel data 2016, **CC BY 4.0**. Cropped around each home city, colour-matched to Blue Marble, by `scripts/earth/build-city-patches.py` |

https://earthobservatory.nasa.gov — NASA imagery is not copyrighted; credit "NASA" is appreciated.
