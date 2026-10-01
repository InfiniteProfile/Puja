# PUJA — Effectively Infinite Profile Universe

**PUJA** is a premium, classic, elegant, and highly polished infinite-profile web application. It demonstrates advanced frontend virtualization by rendering an effectively unbounded universe of human profiles while maintaining strictly bounded DOM nodes and memory consumption.

---

## Key Architectural Principles

### 1. True Virtualization & DOM Recycling
Rather than infinite-scroll implementations that permanently append DOM elements (causing browser sluggishness and memory exhaustion), PUJA maintains a small, fixed pool of recyclable profile card elements (`~16` DOM cards). As the user scrolls, these cards are instantly updated with new profile data derived on-demand.

### 2. BigInt-Safe Indexing
Standard JavaScript numbers lose precision beyond `Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991`). PUJA utilizes native `BigInt` arithmetic for profile identifiers, enabling seamless navigation up to quadrillions, quintillions, and beyond without integer overflow or loss of identity.

### 3. Deterministic Profile Regeneration
Profiles are not stored in memory arrays or databases. Instead, every profile attribute (`name`, `avatar`, `bio`, `age`, `location`, `statistics`) is procedurally synthesized from its unique BigInt ID using a robust seed-based hashing function. Revisiting any profile ID—whether through scrolling back or using the "Jump" feature—instantly reconstructs the exact same identity.

### 4. Decoupled Logical vs. Physical Coordinates
To circumvent browser limitations with astronomical scroll heights, the application utilizes dynamic spacer elements (`spacer-top` and `spacer-bottom`) coupled with a sliding virtual window. This gives the tactile sensation of an endless vertical list while keeping physical scroll metrics entirely manageable.

---

## File Structure

```text
/
├── index.html       # Semantic markup & modal overlays
├── style.css        # Classic editorial theme & responsive layout
├── script.js        # Virtualization engine, BigInt hashing & DOM recycling
└── README.md        # Architecture & documentation
