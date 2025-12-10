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
