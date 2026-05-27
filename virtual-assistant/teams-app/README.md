# ARIA Teams App Package

This folder becomes a `.zip` file that you upload to Teams.

## Contents required

| File | Description |
|------|-------------|
| `manifest.json` | App definition (already here) |
| `color.png` | 192×192 px full-color icon |
| `outline.png` | 32×32 px white-on-transparent icon |

## Create icons quickly

Use any image editor or online tool:
- **color.png**: Blue (#3b82f6) background, white "A" or ARIA logo, 192×192
- **outline.png**: Transparent background, white icon, 32×32

Or generate them with ImageMagick:
```bash
# color.png (192x192)
convert -size 192x192 xc:'#3b82f6' \
  -font DejaVu-Sans-Bold -pointsize 96 -fill white \
  -gravity center -annotate 0 "A" color.png

# outline.png (32x32)
convert -size 32x32 xc:none \
  -font DejaVu-Sans-Bold -pointsize 20 -fill white \
  -gravity center -annotate 0 "A" outline.png
```

## Build the zip

```bash
cd teams-app
# Edit manifest.json — replace $TEAMS_BOT_APP_ID with your actual App ID
zip -j ARIA-teams-app.zip manifest.json color.png outline.png
```

## Upload to Teams

1. Open Microsoft Teams
2. Apps → **Manage your apps** → **Upload an app**
3. Select `ARIA-teams-app.zip`
4. Click **Add** → ARIA appears in your contacts
