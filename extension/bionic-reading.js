/**
 * Bionic Reading for TypingMind
 * 
 * An extension that applies Bionic Reading formatting to AI responses in TypingMind.
 * Optimized for neurodivergent readers (ADHD/Dyslexia) using a 43% fixation point algorithm.
 * 
 * Features:
 * - Neurodivergent-optimized algorithm (43% fixation ratio)
 * - Preserves code blocks (```...```) and inline code (`...`)
 * - Minimal UI: Toggle with Ctrl+Shift+B (or Cmd+Shift+B on Mac)
 * - Visual feedback via toast notifications
 * - Safe handling of Unicode, URLs, and edge cases
 * - Custom font support
 * - Performance Optimized: Micro-batching, WeakSet tracking, CSS injection
 */

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ USER SETTINGS - Edit these values to customize the extension
    // =========================================================================
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
    };
    // =========================================================================
    // END OF USER SETTINGS - Do not edit below unless you know what you're doing
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. CONFIGURATION & CONSTANTS (Internal)
    // -------------------------------------------------------------------------

    const CONFIG = {
        // Storage key for persistence
        STORAGE_KEY: 'typingmind_bionic_reading_enabled',
        
        // Use user settings
        BOLD_RATIO: USER_SETTINGS.BOLD_RATIO,
        FONT_FAMILY: USER_SETTINGS.FONT_FAMILY,
        ENABLED_BY_DEFAULT: USER_SETTINGS.ENABLED_BY_DEFAULT,
        
        // DOM Selectors
        SELECTORS: {
            RESPONSE_BLOCK: '[data-element-id="response-block"]',
            // Selectors to identify code elements to skip
            CODE_BLOCK: 'pre',
            INLINE_CODE: 'code',
        },
        
        // Tags to strictly ignore during traversal
        IGNORE_TAGS: new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'BUTTON']),
    };

    // State management
    const storedState = localStorage.getItem(CONFIG.STORAGE_KEY);
    let isEnabled = storedState === null ? CONFIG.ENABLED_BY_DEFAULT : storedState === 'true';
    
    // Performance: Track processed nodes (auto garbage collected)
    const processedNodes = new WeakSet();
    
    // Micro-batch queue for immediate processing
    let pendingNodes = [];
    let rafScheduled = false;
    let observer = null;
    let styleElement = null;

    // Performance: Pre-compile regex patterns
    const REGEX = {
        URL: /^(https?:\/\/|www\.)/i,
        WHITESPACE: /^\s+$/,
        WORD_PARTS: /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u,
        SPLIT_WHITESPACE: /(\s+)/,
    };

    // -------------------------------------------------------------------------
    // 2. BIONIC READING CORE ALGORITHM
    // -------------------------------------------------------------------------

    /**
     * Calculates how many characters to bold based on word length.
     * Uses the 43% rule which is optimized for reading fixations.
     */
    function getBoldLength(wordLength) {
        if (wordLength <= 1) return 1;
        if (wordLength <= 3) return 1; // Minimal bolding for short words to reduce clutter
        return Math.round(wordLength * CONFIG.BOLD_RATIO);
    }

    /**
     * Applies bionic formatting to a single word.
     * Handles punctuation stripping and reattaching.
     * Performance: Uses pre-compiled regex patterns.
     */
    function processWord(word) {
        // 1. Skip empty or purely whitespace
        if (!word || !word.trim()) return word;

        // 2. Skip URLs (use cached regex)
        if (REGEX.URL.test(word)) return word;

        // 3. Separate punctuation from the actual word part (use cached regex)
        const match = word.match(REGEX.WORD_PARTS);

        if (!match) {
            // If strictly symbols (e.g. "->"), return as is
            return word;
        }

        const [_, prefix, core, suffix] = match;

        // 4. Handle hyphenated words (e.g., "self-taught")
        if (core.includes('-')) {
            const parts = core.split('-');
            const processedParts = parts.map(part => {
                const len = getBoldLength(part.length);
                return `<b>${part.slice(0, len)}</b>${part.slice(len)}`;
            });
            return prefix + processedParts.join('-') + suffix;
        }

        // 5. Normal processing
        const boldLen = getBoldLength(core.length);
        const boldedPart = `<b>${core.slice(0, boldLen)}</b>${core.slice(boldLen)}`;
        
        return prefix + boldedPart + suffix;
    }

    /**
     * Transforms a text string into Bionic Reading HTML.
     * Preserves whitespace structure.
     * Performance: Uses pre-compiled regex, early returns for short text.
     */
    function transformText(text) {
        // Performance: Skip very short or whitespace-only text
        if (!text || text.length < 2) return text;
        
        // Split by whitespace but keep the delimiters (use cached regex)
        const parts = text.split(REGEX.SPLIT_WHITESPACE);
        
        // Performance: Use for loop instead of map for large arrays
        const len = parts.length;
        const result = new Array(len);
        
        for (let i = 0; i < len; i++) {
            const part = parts[i];
            // If it's whitespace, return as is (use cached regex)
            result[i] = REGEX.WHITESPACE.test(part) ? part : processWord(part);
        }
        
        return result.join('');
    }

    // -------------------------------------------------------------------------
    // 3. DOM MANIPULATION & PROCESSING
    // -------------------------------------------------------------------------

    /**
     * Checks if an element or its ancestors are code blocks or user input areas.
     */
    function shouldSkipNode(node) {
        let current = node;
        // Limit traversal depth for performance
        let depth = 0;
        const maxDepth = 5;

        while (current && current !== document.body && depth < maxDepth) {
            // Safety: Skip invalid nodes
            if (!current.tagName) {
                current = current.parentNode;
                depth++;
                continue;
            }

            // Skip code blocks, scripts, styles, and form elements
            if (CONFIG.IGNORE_TAGS.has(current.tagName)) {
                return true;
            }
            
            // Skip user notes and inputs (Safety against interfering with user data)
            if (current.dataset && (
                current.dataset.elementId === 'user-note' || 
                current.dataset.elementId === 'message-input' ||
                current.getAttribute('contenteditable') === 'true'
            )) {
                return true;
            }

            // Check for bionic wrapper to prevent nested processing
            if (current.classList && current.classList.contains('bionic-text-wrapper')) {
                return true;
            }
            current = current.parentNode;
            depth++;
        }
        return false;
    }

    /**
     * Process a single text node immediately.
     */
    function processTextNode(node) {
        // Strict Validation
        if (!node || !node.parentNode) return;
        if (processedNodes.has(node)) return;
        
        // Safety: catch access errors
        try {
            if (!node.nodeValue || !node.nodeValue.trim()) return;
            if (shouldSkipNode(node.parentNode)) return;

            const text = node.nodeValue;
            const bionicHtml = transformText(text);

            // Only modify DOM if there's a change
            if (text !== bionicHtml) {
                const span = document.createElement('span');
                span.className = 'bionic-text-wrapper';
                span.innerHTML = bionicHtml;
                
                // Safety: Verify parent still exists before replacement
                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    // Mark the new nodes as processed
                    processedNodes.add(span);
                }
            } else {
                // Mark as processed even if no change
                processedNodes.add(node);
            }
        } catch (e) {
            // Silent fail to prevent UI disruption
            console.debug('[Bionic Reading] Skipped node due to error:', e);
        }
    }

    /**
     * FLUSH BATCH: Process all pending nodes in one RAF frame
     */
    function processBatch() {
        rafScheduled = false;
        
        if (!isEnabled || pendingNodes.length === 0) {
            pendingNodes = [];
            return;
        }

        const batch = pendingNodes;
        pendingNodes = []; // Clear queue immediately

        // Process all nodes in this frame
        for (let i = 0; i < batch.length; i++) {
            processTextNode(batch[i]);
        }
    }

    /**
     * Queue a node for processing in next frame
     */
    function queueNode(node) {
        pendingNodes.push(node);
        
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    // -------------------------------------------------------------------------
    // 4. STYLING & REVERT
    // -------------------------------------------------------------------------

    function injectStyles() {
        if (styleElement) return;
        if (!CONFIG.FONT_FAMILY) return;

        styleElement = document.createElement('style');
        styleElement.id = 'bionic-reading-styles';
        styleElement.textContent = `
            ${CONFIG.SELECTORS.RESPONSE_BLOCK} {
                font-family: ${CONFIG.FONT_FAMILY} !important;
            }
            /* Ensure code blocks don't inherit the variable font */
            ${CONFIG.SELECTORS.RESPONSE_BLOCK} pre, 
            ${CONFIG.SELECTORS.RESPONSE_BLOCK} code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            }
        `;
        document.head.appendChild(styleElement);
    }

    function removeStyles() {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }

    function revertAllProcessing() {
        const wrappers = document.querySelectorAll('.bionic-text-wrapper');
        for (let i = 0; i < wrappers.length; i++) {
            const span = wrappers[i];
            const text = span.textContent;
            const textNode = document.createTextNode(text);
            span.parentNode.replaceChild(textNode, span);
        }
        
        // Also remove custom font
        removeStyles();
    }

    /**
     * Initial scan of existing content
     */
    function processExistingContent() {
        const blocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        blocks.forEach(block => {
            const walker = document.createTreeWalker(
                block,
                NodeFilter.SHOW_TEXT,
                null
            );
            
            let node;
            while (node = walker.nextNode()) {
                queueNode(node);
            }
        });
    }

    // -------------------------------------------------------------------------
    // 5. OBSERVER (Optimized)
    // -------------------------------------------------------------------------

    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver((mutations) => {
            if (!isEnabled) return;

            for (const mutation of mutations) {
                // We only care about added nodes (childList)
                if (mutation.type === 'childList') {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        // If it's a text node, check if it's inside a response block
                        if (node.nodeType === Node.TEXT_NODE) {
                            if (node.parentElement && node.parentElement.closest(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                                queueNode(node);
                            }
                        } 
                        // If it's an element, look for text nodes inside
                        else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if element is or is inside response block
                            if (node.matches(CONFIG.SELECTORS.RESPONSE_BLOCK) || node.closest(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
                                let textNode;
                                while (textNode = walker.nextNode()) {
                                    queueNode(textNode);
                                }
                            }
                        }
                    }
                }
            }
        });

        // Observe document body for added nodes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false // Don't observe text changes, only insertions
        });
    }

    // -------------------------------------------------------------------------
    // 6. INITIALIZATION & EVENTS
    // -------------------------------------------------------------------------

    function showToast(message) {
        const existing = document.getElementById('bionic-reading-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'bionic-reading-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1f2937;
            color: #f3f4f6;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #374151;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s, transform 0.3s;
        `;

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function toggleExtension() {
        isEnabled = !isEnabled;
        localStorage.setItem(CONFIG.STORAGE_KEY, isEnabled);

        if (isEnabled) {
            showToast('📖 Bionic Reading: ON');
            injectStyles();
            processExistingContent();
        } else {
            showToast('📖 Bionic Reading: OFF');
            revertAllProcessing();
            pendingNodes = []; // Clear pending queue
        }
    }

    function init() {
        console.log('[Bionic Reading] Initializing v2.0 (Optimized)...');

        // Keyboard Shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                toggleExtension();
            }
        });

        // Start Observer
        setupObserver();

        // Mobile Chat Command
        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const target = e.target;
                if (target.tagName === 'TEXTAREA' && target.id === 'chat-input-textbox') {
                    if (target.value.trim().toLowerCase() === '/bionic') {
                        e.preventDefault();
                        e.stopPropagation();
                        target.value = '';
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        toggleExtension();
                    }
                }
            }
        }, { capture: true });

        // Initial Run
        if (isEnabled) {
            injectStyles();
            // Small delay to let page load
            setTimeout(processExistingContent, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
