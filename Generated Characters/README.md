# Sprout Lands-compatible character sheets

Five original 8-direction character movement sheets, prepared to match the layout used by `teemo 8 directions.png`.

## Game-ready files

- `capybara-natural-walk-8dir-3frame-128x48.png`
- `capybara-gardener-walk-8dir-3frame-128x48.png`
- `capybara-baker-walk-8dir-3frame-128x48.png`
- `sky-puppy-walk-8dir-3frame-128x48.png`
- `long-ear-white-puppy-walk-8dir-3frame-128x48.png`
- `forest-imp-walk-8dir-3frame-128x48.png`

Every sheet is:

- 128 x 48 pixels
- 8 columns x 3 rows
- 16 x 16 pixels per frame
- genuinely transparent outside the sprites
- hard-edged pixel art with no partial-alpha pixels
- reduced to 14 colors per character

## Frame layout

Columns, left to right:

1. back
2. back-left diagonal
3. left
4. front-left diagonal
5. front
6. front-right diagonal
7. right
8. back-right diagonal

Rows, top to bottom:

1. left step
2. neutral/contact
3. right step

## Supporting files

- `previews/` contains exact 8x nearest-neighbor enlargements for visual inspection only.
- `high-resolution-sources/` contains the original generated transparent sheets before native-size reduction and palette cleanup.

## Generation notes

Built-in image generation was used with the existing Sprout Lands character sheets as the pixel-scale, palette, silhouette, grid, and movement reference. The supplied mascot images were used only as loose personality and silhouette inspiration; the sky puppy and forest imp are original designs with different colors, details, and accessories.

Prompt set: three original capybara villagers (natural, gardener, baker), one original cream floppy-eared sky puppy with blue accents, one dedicated white long-eared puppy matching the supplied character reference's defining silhouette and facial colors, and one original plum-hooded forest imp with a mint acorn emblem. Each prompt required a transparent 128 x 48 logical sheet, an 8 x 3 grid of 16 x 16 cells, eight facing directions, and a three-frame walk cycle.

The surrounding Sprout Lands asset pack retains its own license and required Cup Nooble attribution.
