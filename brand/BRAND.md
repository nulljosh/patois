# Patois brand kit and design system

a pair of quotation marks: what people actually say

## The mark
Pat, flat and facing right, on the blue gradient tile. No text, no outline. `mascot.svg` is the character alone for the app, the lesson-complete screen and the landing.

- `../Patois.icon` is the source of truth (Icon Composer). Light and dark fills are set in it.
- `../icon.svg` is the flat copy for READMEs (shown at 80 px). `icon-1024.png` is the App Store icon, no alpha.
- Pat's colours: scarlet `#F2493E` head, gold `#FFC53D` chest, blue `#2A74D6` wing, cream `#FFE29A` bill. They belong to the mascot only; the app UI stays blue.
- Clear space equal to the width of the glyph's thickest stroke. Smallest size 16 px.

## Colour
| Role | Value |
|---|---|
| Accent | `#2E6FC2` |
| Gradient top | `#6FB0F0` |
| Text | `#1d1d1f` light, `#f5f5f7` dark |
| Background | `#ffffff` light, `#000000` dark |
| Surface | `#f5f5f7` light, `#1c1c1e` dark |

The accent is for actions, links and the icon. Never brown, beige, purple or teal.

## Type
The system font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Lato, "Helvetica Neue", Helvetica, Arial, sans-serif`. Scale 34/41 bold, 22/28, 17/24, 15/20, 13/18.

## Space and shape
- Space on the 8 point grid: 4, 8, 12, 16, 24, 32, 48. Side margin 20. Reading column 680.
- Radii: cards 28, grouped lists 20, controls fully round, icon 22 percent.
- Controls are 48 points tall capsules, one height in a row. Focus is a 4 point ring at 30 percent accent.
- Motion is 0.2 s ease and honours reduced motion.

`tokens.css` holds the app's accent. Everything else comes from the shared token file.
