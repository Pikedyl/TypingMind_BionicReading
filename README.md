# TypingMind Bionic Reading Extension

A browser extension for TypingMind that enables Bionic Reading to enhance text comprehension and reading speed for neurodivergent readers.

## 🧠 What is Bionic Reading?

Bionic Reading is a reading enhancement technique that guides the eye through text by highlighting the most concise parts of words. This method helps the brain remember previously learned words more quickly by emphasizing the initial letters, creating artificial fixation points that facilitate faster and more focused reading.

### Benefits for Neurodivergent Readers

This extension is particularly beneficial for neurodivergent individuals, including those with:

- **ADHD** - Reduces distraction and helps maintain focus on text
- **Dyslexia** - Provides visual anchors that make word recognition easier
- **Autism Spectrum** - Creates consistent, predictable text patterns that reduce cognitive load
- **Processing Disorders** - Decreases the effort required to decode text
- **Reading Fatigue** - Makes long-form reading less mentally exhausting

By bolding the first portion of each word, Bionic Reading creates a visual guide that helps the eye move through text more smoothly, reducing re-reading and improving comprehension.

## ✨ Features

- **Quick Toggle**: Instantly enable or disable Bionic Reading with a keyboard shortcut
- **Visual Confirmation**: Toast notification confirms when the feature is toggled
- **Persistent Settings**: Your preference is saved using localStorage across sessions
- **Real-time Updates**: Uses MutationObserver to apply formatting dynamically as content loads
- **TypingMind Integration**: Seamlessly integrates with the TypingMind interface

## 🚀 Usage

Press **`Ctrl + Shift + B`** (or **`Cmd + Shift + B`** on Mac) to toggle Bionic Reading on or off.

You'll see a small confirmation popup (toast notification) at the bottom right of the screen confirming the state change.

## 🔧 Technical Implementation

This extension follows the established patterns of TypingMind extensions:

- **MutationObserver**: Monitors the DOM for changes and applies Bionic Reading formatting to new content dynamically
- **localStorage**: Preserves user preferences between sessions, ensuring consistent experience
- **Toast Notifications**: Provides non-intrusive visual feedback when toggling the feature
- **Event-driven Architecture**: Responds to keyboard shortcuts and DOM changes efficiently

## 📦 Installation

1. Clone or download this repository
2. Load the extension in your browser:
   - **Chrome/Edge**: Navigate to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked"
   - **Firefox**: Navigate to `about:debugging#/runtime/this-firefox` and click "Load Temporary Add-on"
3. Select the extension directory
4. Open TypingMind and use the keyboard shortcut to enable Bionic Reading

## 🎯 How It Works

When you activate Bionic Reading:

1. The extension scans all text content in TypingMind
2. Each word is analyzed and the first portion (typically 40-60%) is wrapped in bold formatting
3. The formatting is applied in real-time as you read and interact with the interface
4. Your preference is saved automatically, so the next time you open TypingMind, your setting persists

## 🤝 Contributing

Contributions are welcome! Whether you're improving the algorithm, adding new features, or fixing bugs, feel free to submit a pull request.

## 📄 License

This project is open source and available under the MIT License.

## 🌟 Acknowledgments

This extension is built specifically for the neurodivergent community to make reading and learning more accessible. Bionic Reading is a patented technology, and this implementation aims to provide similar functionality within the TypingMind ecosystem.

---

**Note**: This is an unofficial community extension and is not affiliated with or endorsed by TypingMind or Bionic Reading®.
# Bionic Reading Extension for TypingMind

A lightweight, neurodivergent-optimized extension for TypingMind that applies Bionic Reading formatting to AI responses. This extension is designed to improve reading speed and comprehension for users with ADHD or Dyslexia by highlighting the initial letters of words (fixation points).

**✨ V3.1 - Now with Enhanced Stability & Crash Protection!**

## Features

- **Bionic Reading**: Bolds the first part of each word to guide your eyes and improve reading flow
- **Custom Font**: Change the font of AI responses (default: Segoe UI Light)
- **Neurodivergent-Optimized**: Uses a **43% fixation ratio** based on EEG research
- **Mobile Friendly**: Toggle with `/bionic` command on touch devices
- **Code Preservation**: Skips code blocks and inline code to prevent syntax corruption
- **Easy Toggle**: Turn on/off with keyboard shortcut or chat command
- **⚡ High Performance**: Optimized for minimal memory usage and CPU impact
- **🎯 Smart Processing**: Only processes visible content with Intersection Observer
- **🛡️ Crash Protection**: Intelligently skips streaming text to prevent UI artifacts

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
    // Examples: "Segoe UI Light", "Segoe UI", "Arial", "Verdana", "Open Sans", "Roboto"
    // Set to null to use TypingMind's default font
    FONT_FAMILY: '"Segoe UI Light", "Segoe UI", system-ui, -apple-system, sans-serif',

    // BOLD RATIO: How much of each word to bold (0.0 to 1.0)
    // 0.43 (43%) is optimized for ADHD/Dyslexia based on EEG research
    // Try 0.50 for more bold, or 0.33 for less
    BOLD_RATIO: 0.43,

    // START ENABLED: Should bionic reading be ON when you first load the page?
    // true = starts enabled, false = starts disabled
    ENABLED_BY_DEFAULT: true,

    // BATCH SIZE: Maximum nodes to process per frame (prevents freezing)
    // Lower = more responsive UI, Higher = faster processing. Default: 50
    MAX_BATCH_SIZE: 50,
    
    // DEBUG: Enable console logging for troubleshooting
    DEBUG_MODE: false,
};
```

### What Each Setting Does

| Setting | What It Does | Examples |
|---------|--------------|----------|
| `FONT_FAMILY` | Changes the font of AI responses | `"Arial"`, `"Verdana"`, `"Roboto"`, or `null` for default |
| `BOLD_RATIO` | How much of each word to bold | `0.33` (less), `0.43` (default), `0.50` (more) |
| `ENABLED_BY_DEFAULT` | Start with bionic reading on or off | `true` or `false` |
| `MAX_BATCH_SIZE` | Nodes to process per frame | `25` (more responsive), `50` (default), `100` (faster) |
| `DEBUG_MODE` | Enable detailed logs in console | `true` (on), `false` (off) |

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

The extension uses a multi-layered observation strategy:
1. **Global Observer**: Detects new AI response blocks being added to the page
2. **Intersection Observer**: Only processes response blocks that are visible on screen (lazy loading)
3. **Block Observers**: Watches individual response blocks for streaming text updates
4. **Batch Processing**: Processes text nodes in controlled batches (50 per frame) to prevent UI freezing
5. **Smart Filtering**: Skips code blocks, numbers, URLs, and other technical content
6. **Text Transformation**: Bolds the first ~43% of each word for optimal reading flow

Example: "Reading" becomes "**Rea**ding"

### Performance Features
- ⚡ **Targeted Observation**: Only observes response blocks, not the entire page
- 🎯 **Lazy Loading**: Off-screen content isn't processed until you scroll to it
- 🚦 **Queue Protection**: Maximum 1000 nodes in queue prevents memory overflow
- 🧹 **Auto Cleanup**: All observers properly disconnect when disabled or page unloads
- 📊 **Optimized Regex**: 60% fewer regex checks per word vs V2.0

---

## Troubleshooting

**Extension not working?**
- Make sure you refreshed the page after installing
- Check that the URL is correct and accessible
- Try `?safe_mode=1` at the end of TypingMind URL to disable all extensions, then re-enable

**Font not changing?**
- Make sure the font is installed on your device, or use a web-safe font
- Check that `FONT_FAMILY` is not set to `null`

**Performance issues?**
- Try reducing `MAX_BATCH_SIZE` to 25 for slower devices
- V3.0 should use significantly less memory than previous versions
- Check browser console for any warning messages

**Want to reset?**
- Clear your browser's localStorage for TypingMind, or
- Type `/bionic` to toggle the extension off

## Performance Notes

V3.0 includes major performance improvements:
- **60% fewer regex operations** per word
- **Lazy loading** - only processes visible content
- **Automatic memory cleanup** prevents leaks
- **Queue overflow protection** prevents browser freezing
- **Multi-level observation** reduces unnecessary DOM scanning

See [CHANGELOG.md](CHANGELOG.md) for detailed performance metrics and improvements.

---

## Version History

- **V3.0** (December 2025): Major performance & memory optimizations
- **V2.0**: Micro-batching architecture
- **V1.0**: Initial release

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

MIT License - Free to use and modify.
