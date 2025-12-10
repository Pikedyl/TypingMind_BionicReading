# Bionic Reading Extension for TypingMind

A lightweight, neurodivergent-optimized extension for TypingMind that applies Bionic Reading formatting to AI responses. This extension is designed to improve reading speed and comprehension for users with ADHD or Dyslexia by highlighting the initial letters of words (fixation points).

## Features

- **Bionic Reading**: Bolds the first part of each word to guide your eyes and improve reading flow
- **Custom Font**: Change the font of AI responses (default: Segoe UI)
- **Neurodivergent-Optimized**: Uses a **43% fixation ratio** based on EEG research
- **Mobile Friendly**: Toggle with `/bionic` command on touch devices
- **Code Preservation**: Skips code blocks and inline code to prevent syntax corruption
- **Easy Toggle**: Turn on/off with keyboard shortcut or chat command

---

## Installation

1. Open **TypingMind**
2. Go to **Settings** → **Extensions**
3. Click **Add Extension**
4. Enter a name: `Bionic Reading`
5. Paste this URL:
   ```
   https://Pikedyl.github.io/TypingMind_BionicReading/extension/bionic-reading.js
   ```
6. Click **Save**
7. Refresh the page

---

## How to Use

### Toggle On/Off

| Platform | How to Toggle |
|----------|---------------|
| **Desktop** | Press `Ctrl + Shift + B` (Windows/Linux) or `Cmd + Shift + B` (Mac) |
| **Mobile** | Type `/bionic` in the chat and press Send |

A notification will confirm when the extension is turned on or off.

---

## Customization

Want to change the font or adjust how the extension works? You can customize it by hosting your own copy.

### Step 1: Get the Code

1. Go to the [extension file on GitHub](https://github.com/Pikedyl/TypingMind_BionicReading/blob/main/extension/bionic-reading.js)
2. Click the **Raw** button
3. Copy all the code

### Step 2: Edit the Settings

At the top of the file, you'll find the `USER_SETTINGS` section:

```javascript
const USER_SETTINGS = {
    // FONT: Set your preferred font for AI responses
    // Examples: "Segoe UI", "Arial", "Verdana", "Open Sans", "Roboto"
    // Set to null to use TypingMind's default font
    FONT_FAMILY: '"Segoe UI", system-ui, -apple-system, sans-serif',

    // BOLD RATIO: How much of each word to bold (0.0 to 1.0)
    // 0.43 (43%) is optimized for ADHD/Dyslexia based on EEG research
    // Try 0.50 for more bold, or 0.33 for less
    BOLD_RATIO: 0.43,

    // START ENABLED: Should bionic reading be ON when you first load the page?
    // true = starts enabled, false = starts disabled
    ENABLED_BY_DEFAULT: true,

    // PROCESSING DELAY: Milliseconds to wait before processing streaming text
    // Lower = faster updates but more CPU usage. Default: 500
    DEBOUNCE_MS: 500,
};
```

### What Each Setting Does

| Setting | What It Does | Examples |
|---------|--------------|----------|
| `FONT_FAMILY` | Changes the font of AI responses | `"Arial"`, `"Verdana"`, `"Roboto"`, or `null` for default |
| `BOLD_RATIO` | How much of each word to bold | `0.33` (less), `0.43` (default), `0.50` (more) |
| `ENABLED_BY_DEFAULT` | Start with bionic reading on or off | `true` or `false` |
| `DEBOUNCE_MS` | How fast to process streaming text | `300` (faster), `500` (default), `1000` (slower) |

### Step 3: Host Your Custom Version

After editing, you need to host the file somewhere. Options:

1. **GitHub Gist** (easiest):
   - Go to [gist.github.com](https://gist.github.com)
   - Paste your code
   - Click "Create public gist"
   - Click "Raw" and copy that URL

2. **Your own GitHub repo**:
   - Fork this repo
   - Edit the file
   - Use the raw GitHub URL

3. **Any web host** that serves `.js` files with the correct MIME type

### Step 4: Use Your Custom URL

In TypingMind, update the extension URL to point to your custom version.

---

## How It Works

The extension watches for new AI responses and:
1. Finds all text (skipping code blocks)
2. Bolds the first ~43% of each word
3. Applies your custom font (if set)

Example: "Reading" becomes "**Rea**ding"

---

## Troubleshooting

**Extension not working?**
- Make sure you refreshed the page after installing
- Check that the URL is correct and accessible
- Try `?safe_mode=1` at the end of TypingMind URL to disable all extensions, then re-enable

**Font not changing?**
- Make sure the font is installed on your device, or use a web-safe font
- Check that `FONT_FAMILY` is not set to `null`

**Want to reset?**
- Clear your browser's localStorage for TypingMind, or
- Type `/bionic` to toggle the extension off

---

## License

MIT License - Free to use and modify.
