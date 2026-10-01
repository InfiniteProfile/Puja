# Puja Infinite Profile Generator

A dependency-free, browser-only profile universe where **Puja 1 → Puja N** is logically unbounded. It renders a premium social-profile feed while keeping the live DOM and memory footprint deliberately small.

## Run it

Open `index.html` in a modern browser. No build step, web server, account, database, network request, or package installation is required for the application itself.

Use the **Jump** field to go directly to any positive integer, including values beyond JavaScript's normal safe-integer limit, such as `9007199254740992` or much larger decimal integers.

## Architecture

### Deterministic profiles

A profile is never stored permanently. Its decimal profile number is parsed as a `BigInt`, mixed through a small deterministic BigInt hash, and used to choose all of its attributes:

- Display name: `Puja N`
- Handle: `@PujaN`
- SVG avatar geometry and colors
- Bio, location, profession, interests, metric values, and accent color

Therefore the same exact logical ID always produces the same profile. Leaving Puja 500, visiting Puja 50,000, and returning to Puja 500 regenerates the identical content with no historical profile database.

### Virtualized, recycled DOM

The app creates a fixed pool of **17 profile-card elements** at startup. When the visible logical range changes, those same elements are filled with a new contiguous window of profiles. It does not append one card for every visited profile.

A configurable buffer (`BUFFER`) renders a few cards before the viewport. Old cards are overwritten/recycled as the feed moves, so cards far above or below view no longer represent active old profiles. This bounds the DOM and prevents an `allProfiles`-style memory leak.

### Logical versus physical scrolling

Browsers cannot represent truly infinite document heights, nor can scroll offsets accurately span arbitrary BigInt values. Puja Infinite separates the two concepts:

- **Logical position**: an exact BigInt profile ID.
- **Physical position**: a modest, fixed scrolling region of 4,000 card rows.

As the physical scroll position nears either edge, the app recalculates the logical anchor and silently recenters the scroll offset. This makes forward and backward exploration effectively unbounded while CSS height stays manageable. Profile 1 is the lower bound; attempts to scroll above it remain at the beginning.

A jump is constant-work: it updates the logical anchor, moves to the middle of the physical region, and renders only the fixed card pool. It never generates intermediate profiles.

## Performance choices

- `BigInt` preserves exact identity above `Number.MAX_SAFE_INTEGER`.
- A passive scroll listener schedules rendering with `requestAnimationFrame`.
- The card pool has a fixed size; no visited-profile array is retained.
- Avatar artwork is inline deterministic SVG, so no unlimited external image requests occur.
- Event delegation handles all card “View Profile” actions with one listener.
- CSS `contain` limits card layout and paint work.

## Customization

- **Card pool / buffer:** edit `POOL_SIZE` and `BUFFER` in `script.js`.
- **Physical scroll range:** edit `REGION_ROWS` and `ANCHOR_ROW`. Keep the anchor comfortably away from each end.
- **Profile content:** change `locations`, `professions`, `interests`, `bios`, and `palettes` in `script.js`. Keep choices driven by `pick(n, salt, ...)` to retain determinism.
- **Avatar:** edit the `avatar()` SVG function.
- **Visual system:** modify CSS variables at the top of `style.css`, particularly colors, card height, and spacing.

## Browser limits and notes

This design is effectively infinite in logical terms, not physically infinite. A browser cannot display an actually infinite list, use infinite CSS heights, or accept an unbounded amount of text in an input. In practice, supported profile values are arbitrary positive decimal integers that the browser can parse into a BigInt and that fit within available input/memory constraints. No conversion of the logical ID to a JavaScript `Number` occurs.

The included font import is cosmetic. If offline, system fallbacks retain full functionality.

## Verification checklist

The implementation is designed for these cases:

- Sequential browsing from Puja 1 through Puja 100 and beyond.
- Direct jumps to 10,000; 100,000; 1,000,000; and 9,007,199,254,740,992.
- Exact identity around and beyond `Number.MAX_SAFE_INTEGER`.
- Reverse browsing back to Puja 1.
- Fast scrolls, repeated jumps, and long sessions with a fixed card pool.
- Deterministic regeneration after navigating away from and back to any profile.
