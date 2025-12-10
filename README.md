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

## 🚀 Features

- **Neurodivergent-Optimized**: Uses a scientifically validated **43% fixation ratio** (based on EEG research) rather than a simple 50% split.
- **Mobile Friendly**: Supports a "magic command" (`/bionic`) for easy toggling on touch devices.
- **Code Preservation**: Smartly detects and skips code blocks (` ``` `) and inline code (` ` `) to prevent syntax corruption.
- **Non-Intrusive UI**: No clutter. Toggle it on/off with a simple keyboard shortcut or chat command.
- **Safe & Robust**: Handles special characters, hyphens, and Unicode correctly.
- **Visual Feedback**: Toast notifications indicate when the mode is toggled.

## 📥 Installation

1. Open **TypingMind**.
2. Go to **Settings** > **Extensions**.
3. Click **Add Extension**.
4. Enter a name (e.g., "Bionic Reading").
5. In the **JavaScript Code** field, paste the **Extension URL**:
   ```
   https://Pikedyl.github.io/TypingMind_BionicReading/extension/bionic-reading.js
   ```
6. Click **Save**.
7. Refresh the page to load the extension.

## 📖 Usage

The extension is **Enabled by Default**.

### Desktop
- **Toggle On/Off**: Press `Ctrl + Shift + B` (Windows/Linux) or `Cmd + Shift + B` (Mac).

### Mobile / Touch
- **Toggle On/Off**: Type `/bionic` in the chat input and press **Enter/Send**.
  - The command will be intercepted (not sent to AI), the mode will toggle, and you'll see a confirmation toast.

- A notification will appear confirming the status.
- When enabled, all existing and new AI responses will automatically be formatted.

## 🛠️ Configuration

The extension works out of the box, but you can modify the source code to adjust settings:

- `BOLD_RATIO`: Change `0.43` to another value (e.g., `0.50`) to adjust bold intensity.
- `DEBOUNCE_MS`: Adjust `500` to change how quickly it processes streaming text.

## 🔍 How It Works

The extension uses a `MutationObserver` to watch for new messages in the chat interface. When a new response arrives, it:
1. Identifies text content while strictly skipping code blocks (`<pre>`, `<code>`).
2. Applies the fixation algorithm to each word.
3. Replaces the text with formatted HTML (e.g., `**Bio**nic`).

## 📄 License

MIT License. Free to use and modify.
