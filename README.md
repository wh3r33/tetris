# Canvas Tetris

A complete classic Tetris clone built with HTML5 Canvas, vanilla JavaScript, HTML, and CSS. It is a static project, so it can be deployed directly with GitHub Pages.

## Features

- 10 x 20 playfield rendered with HTML5 Canvas
- All seven classic tetrominoes with a modern 7-bag randomizer
- Time-based `requestAnimationFrame` game loop
- Level-based falling speed
- Soft drop, hard drop, hold, next preview, and ghost piece
- Collision checks for walls, floor, and settled blocks
- Algorithmic clockwise matrix rotation with simple wall kicks
- Single, double, triple, and Tetris line clears
- Lightweight line-clear flash animation
- Local top-10 leaderboard with initials, score, and date
- Web Audio API sounds for rotate, hard drop, line clear, and game over
- Classic Game Boy and modern color themes saved in `localStorage`
- Touch controls for mobile play

## Controls

| Action | Keyboard |
| --- | --- |
| Move left | Left Arrow |
| Move right | Right Arrow |
| Soft drop | Down Arrow |
| Rotate clockwise | Up Arrow or X |
| Hard drop | Space |
| Hold piece | C |
| Pause | P or Escape |

Touch controls:

- Swipe left or right to move
- Swipe down to soft drop
- Long or fast swipe down to hard drop
- Tap to rotate

## Architecture Overview

- `index.html` defines the game canvas, preview canvases, stats, controls, theme selector, restart button, and leaderboard.
- `style.css` contains the responsive layout, polished UI styling, and theme-specific presentation.
- `script.js` keeps game systems separated into classes:
  - `TetrisGame` owns board state, active piece state, collision, locking, scoring, levels, hold, and line clears.
  - `Renderer` owns all canvas drawing for the board, ghost piece, active piece, settled blocks, and previews.
  - `BagRandomizer` implements the 7-bag tetromino sequence.
  - `AudioManager` uses the Web Audio API for lightweight generated sounds.
  - `StorageManager` handles theme and leaderboard persistence.
  - `App` wires input, UI updates, the animation loop, and restart behavior.

The settled playfield is stored as a 2D array separate from the active falling piece. Tetrominoes are represented as matrices, and each active piece contains `type`, `matrix`, `x`, `y`, and `color`.

## Deployment To GitHub Pages

1. Commit `index.html`, `style.css`, `script.js`, and `README.md`.
2. Push the repository to GitHub.
3. In the repository settings, open **Pages**.
4. Choose the branch to deploy, usually `main`.
5. Select the repository root as the publishing source.
6. Save the settings and wait for GitHub Pages to publish the static site.

No build step is required.

## Screenshot Placeholders

Add screenshots here after deployment or local capture:

- `screenshots/modern-theme.png`
- `screenshots/gameboy-theme.png`
- `screenshots/mobile-layout.png`

## Gameplay GIF Placeholder

Add a gameplay demonstration GIF here:

- `media/gameplay-demo.gif`
