# Bionic Reading for TypingMind: Technical Guide

This document outlines the architectural decisions, performance optimizations, and exclusion criteria for the Bionic Reading extension in TypingMind.

## 1. Architecture: The "Process-on-Insert" Strategy

The previous implementation suffered from significant performance issues due to aggressive DOM observation (`characterData: true`) and repeated processing of the same content. The new **V2.0 Architecture** solves this by:

### Key Principles
*   **Direct Node Processing**: We process text nodes *immediately* as they are added to the DOM via `MutationObserver` (childList), rather than rescanning the entire block.
*   **Micro-Batching**: Instead of processing synchronously (which blocks the UI thread), we queue nodes and process them in a single `requestAnimationFrame` batch (~16ms window).
*   **Zero-Overhead Styling**: We use a global CSS stylesheet injection for font changes instead of applying inline styles to every element.
*   **WeakSet Tracking**: We use a `WeakSet` to track processed nodes, ensuring we never process the same node twice while preventing memory leaks (references are auto-garbage collected).

### Comparison
| Feature | Old Approach (V1) | New Approach (V2) |
| :--- | :--- | :--- |
| **Observation** | `characterData: true` (Fires on every keystroke) | `childList: true` (Fires only on new content) |
| **Processing** | `TreeWalker` scan of entire block | Direct processing of new mutation nodes |
| **Timing** | Debounced (100ms delay) | Immediate Micro-batch (RAF) |
| **Memory** | Stored `originalText` on every span | Uses `textContent` for revert (Zero storage) |
| **Performance** | O(N) where N is total block size | O(1) relative to new content size |

## 2. Bionic Reading Algorithm & Criteria

We use a **43% fixation point** algorithm, which is empirically optimized for neurodivergent readers (ADHD/Dyslexia).

### Bolding Strategy
*   **Word Length 1-3**: Bold 1 character (or skip if purely functional/short)
*   **Word Length > 3**: Bold `round(length * 0.43)` characters

### Exclusion Criteria (When NOT to Format)
To ensure technical accuracy and readability, we strictly **exclude** the following patterns from formatting:

1.  **URLs & Links**: `https://...`, `www...`, `mailto:`
    *   *Reason*: Formatting breaks the visual continuity of the link string.
2.  **Numbers & Metrics**: `123`, `12.5%`, `1,000`
    *   *Reason*: Bolding digits ("**12**3") creates confusion about the value's magnitude.
3.  **Dates & Times**: `2023-01-01`, `12:00pm`
    *   *Reason*: Standard formats should remain uniform for quick scanning.
4.  **Version Numbers**: `v1.0.2`, `2.5.0`
    *   *Reason*: Technical identifiers lose clarity if partially bolded.
5.  **UUIDs & Hashes**: `a1b2-c3d4...`
    *   *Reason*: Random strings have no semantic "root" to bold.
6.  **Filenames**: `script.js`, `image.png`
    *   *Reason*: The extension is critical; bolding the name but not the extension is jarring.
7.  **Short Non-Lexical Words**: Words < 2 chars with no letters (e.g., `&`, `|`)
    *   *Reason*: Reducing visual noise.

## 3. Safety & Compatibility

To prevent "errors in the display area" and conflicts with TypingMind's React application state:

*   **Targeted Selector**: We strictly observe `[data-element-id="response-block"]` and its children.
*   **User Data Protection**: We explicitly **skip** any nodes that look like:
    *   `[data-element-id="user-note"]`
    *   `[data-element-id="message-input"]`
    *   `contenteditable="true"` elements
*   **DOM Integrity**: We verify `node.parentNode` exists before replacement and use `replaceChild` on text nodes only, never destroying container elements that React might be tracking.
*   **Error Boundaries**: Individual node processing is wrapped in `try-catch` blocks to ensure a single failed node doesn't crash the extension or the page.

## 4. Revert Strategy

Instead of storing the original text in memory (which doubles RAM usage for long chats), we rely on the DOM itself:
1.  **Format**: `TextNode` -> `<span class="bionic-text-wrapper"><b>Bio</b>nic</span>`
2.  **Revert**: Read `span.textContent` (which automatically strips HTML tags) -> Create new `TextNode` -> Replace span.

This results in **zero memory overhead** for "Undo" functionality.
