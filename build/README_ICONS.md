# Icon Files Needed

For building the application, you need icon files in these formats:

## Windows
- `icon.ico` - 256x256px ICO file

## Mac
- `icon.icns` - Mac icon file (use `png2icns` tool to convert)

## Linux
- `icon.png` - 512x512px PNG file

## Creating Icons

You can create icons using:
1. Online tools like favicon.io or icoconvert.com
2. Design software like Photoshop, GIMP, or Figma
3. Automated tools like `electron-icon-builder`

## Recommended Icon Design

For FICOS Campaign Manager:
- Blue/purple gradient background
- White "F" letter or envelope icon
- Modern, flat design style
- High contrast for visibility

## Auto-Generate Icons

Install icon builder:
```bash
npm install --save-dev electron-icon-builder
```

Put a 1024x1024px PNG in this folder named `icon.png`, then run:
```bash
npx electron-icon-builder --input=./build/icon.png --output=./build
```

This will generate .ico, .icns, and .png in all sizes.
