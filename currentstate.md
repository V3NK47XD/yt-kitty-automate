# Current State (2026-05-01)

- Legacy Python folder removed; web app now owns all download/combine/overlay/trim/share logic.
- Server pipeline supports manual captions plus auto captions (random or Gemma) and auto trims to MAX_OUTPUT_SECONDS.
- Filebin sharing endpoint added; preview step can generate a shareable link.
- server/.env and server/.env.example updated to include Gemma, Filebin, and Discord keys.
- UI updated with caption-mode selector and Filebin share output.

## Notes
- Set FONT_PATH to server/fonts/OpenSansExtraBold.ttf (already bundled).
- Auto captions using Gemma require GEMINI_API_KEY; otherwise it falls back to simple captions.
