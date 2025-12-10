/**
 * Bionic Reading for TypingMind - V3.0 OPTIMIZED
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
 * - Performance Optimized: Targeted observation, efficient batching, minimal regex
 * 
 * V3.0 OPTIMIZATIONS:
 * - Targeted MutationObserver (only response blocks, not entire body)
 * - Intersection Observer for lazy processing
 * - Batch size limits to prevent queue overflow
 * - Optimized regex patterns with early returns
 * - Cached DOM queries
 * - Proper cleanup and memory management
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

        // BATCH SIZE: Maximum nodes to process per frame (prevents freezing)
        MAX_BATCH_SIZE: 50,
    };
    // =========================================================================
    // END OF USER SETTINGS - Do not edit below unless you know what you're doing
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. CONFIGURATION & CONSTANTS (Internal)
    // -------------------------------------------------------------------------

    const CONFIG = {
        STORAGE_KEY: 'typingmind_bionic_reading_enabled',
        BOLD_RATIO: USER_SETTINGS.BOLD_RATIO,
        FONT_FAMILY: USER_SETTINGS.FONT_FAMILY,
        ENABLED_BY_DEFAULT: USER_SETTINGS.ENABLED_BY_DEFAULT,
        MAX_BATCH_SIZE: USER_SETTINGS.MAX_BATCH_SIZE,
        
        SELECTORS: {
            RESPONSE_BLOCK: '[data-element-id="response-block"]',
            CODE_BLOCK: 'pre',
            INLINE_CODE: 'code',
        },
        
        // Consolidated ignore tags for faster checks
        IGNORE_TAGS: new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'BUTTON', 'NOSCRIPT']),
    };

    // State management
    const storedState = localStorage.getItem(CONFIG.STORAGE_KEY);
    let isEnabled = storedState === null ? CONFIG.ENABLED_BY_DEFAULT : storedState === 'true';
    
    // Performance: Track processed nodes (auto garbage collected)
    const processedNodes = new WeakSet();
    
    // Micro-batch queue with size limit
    let pendingNodes = [];
    let rafScheduled = false;
    let observer = null;
    let intersectionObserver = null;
    let styleElement = null;
    let responseBlockCache = new Set(); // Cache response blocks we're observing

    // Performance: Pre-compile regex patterns (optimized order - most common first)
    const REGEX = {
        // Fast rejections first
        WHITESPACE: /^\s*$/,
        SINGLE_CHAR: /^.$/,
        NUMERIC: /^\d+([.,]\d+)*%?$/,
        
        // Technical patterns
        URL: /^(https?:\/\/|www\.|mailto:|tel:|ftp:)/i,
        VERSION: /^v?\d+\.\d+/i,
        UUID: /^[0-9a-f]{8}-/i,
        DATE: /^\d{1,4}[-/]\d{1,2}/,
        TIME: /^\d{1,2}:\d{2}/,
        
        // Word processing
        WORD_PARTS: /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:[-''][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u,
    };

    // -------------------------------------------------------------------------
    // 2. BIONIC READING CORE ALGORITHM (OPTIMIZED)
    // -------------------------------------------------------------------------

    /**
     * Calculates how many characters to bold based on word length.
     */
    function getBoldLength(wordLength) {
        if (wordLength <= 3) return 1;
        return Math.round(wordLength * CONFIG.BOLD_RATIO);
    }

    /**
     * Fast check if word should be skipped (optimized with early returns)
     */
    function shouldSkipWord(word) {
        // Most common cases first
        if (word.length < 2) return true;
        if (REGEX.WHITESPACE.test(word)) return true;
        if (REGEX.NUMERIC.test(word)) return true;
        
        // Technical patterns
        if (word.length > 4) { // Only check these for longer strings
            if (REGEX.URL.test(word)) return true;
            if (REGEX.VERSION.test(word)) return true;
            if (REGEX.UUID.test(word)) return true;
        }
        
        if (word.includes(':') && REGEX.TIME.test(word)) return true;
        if (word.includes('-') || word.includes('/')) {
            if (REGEX.DATE.test(word)) return true;
        }
        
        // File extensions (only check if contains dot)
        if (word.includes('.') && word.length < 20) {
            const parts = word.split('.');
            if (parts.length === 2 && parts[1].length <= 5 && /^[a-z0-9]+$/i.test(parts[1])) {
                return true; // Likely a filename
            }
        }
        
        return false;
    }

    /**
     * Applies bionic formatting to a single word (optimized).
     */
    function processWord(word) {
        if (!word || shouldSkipWord(word)) return word;

        const match = word.match(REGEX.WORD_PARTS);
        if (!match) return word;

        const [_, prefix, core, suffix] = match;
        if (!core || core.length < 2) return word;
        
        // Handle hyphenated words
        if (core.includes('-')) {
            const parts = core.split('-');
            const processed = [];
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (/^\d+$/.test(part)) {
                    processed.push(part);
                } else if (part.length > 1) {
                    const len = getBoldLength(part.length);
                    processed.push(`<b>${part.slice(0, len)}</b>${part.slice(len)}`);
                } else {
                    processed.push(part);
                }
            }
            return prefix + processed.join('-') + suffix;
        }

        // Normal processing
        const boldLen = getBoldLength(core.length);
        return `${prefix}<b>${core.slice(0, boldLen)}</b>${core.slice(boldLen)}${suffix}`;
    }

    /**
     * Transforms a text string into Bionic Reading HTML (optimized).
     */
    function transformText(text) {
        if (!text || text.length < 3) return text;
        
        // Fast path: if no word characters, return as-is
        if (!/[\p{L}\p{N}]/u.test(text)) return text;
        
        // Split by whitespace and process
        const words = text.split(/(\s+)/);
        let result = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            result += /\s/.test(word) ? word : processWord(word);
        }
        
        return result;
    }

    // -------------------------------------------------------------------------
    // 3. DOM MANIPULATION & PROCESSING (OPTIMIZED)
    // -------------------------------------------------------------------------

    /**
     * Fast check if node should be skipped (cached parent checks)
     */
    function shouldSkipNode(node) {
        let current = node;
        let depth = 0;

        while (current && depth < 5) {
            if (!current.tagName) {
                current = current.parentNode;
                depth++;
                continue;
            }

            // Fast tag check
            if (CONFIG.IGNORE_TAGS.has(current.tagName)) return true;
            
            // User data protection (only check if dataset exists)
            if (current.dataset) {
                const elId = current.dataset.elementId;
                if (elId === 'user-note' || elId === 'message-input') return true;
            }
            
            // Check contenteditable
            if (current.contentEditable === 'true') return true;

            // Check for bionic wrapper
            if (current.className && current.className.includes('bionic-text-wrapper')) return true;
            
            current = current.parentNode;
            depth++;
        }
        return false;
    }

    /**
     * Process a single text node immediately.
     */
    function processTextNode(node) {
        // Strict validation
        if (!node || !node.parentNode || processedNodes.has(node)) return;
        
        try {
            const text = node.nodeValue;
            if (!text || text.length < 3 || REGEX.WHITESPACE.test(text)) {
                processedNodes.add(node);
                return;
            }
            
            if (shouldSkipNode(node.parentNode)) return;

            const bionicHtml = transformText(text);

            // Only modify DOM if there's a change
            if (text !== bionicHtml && bionicHtml.includes('<b>')) {
                const span = document.createElement('span');
                span.className = 'bionic-text-wrapper';
                span.innerHTML = bionicHtml;
                
                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    processedNodes.add(span);
                }
            } else {
                processedNodes.add(node);
            }
        } catch (e) {
            console.debug('[Bionic Reading] Error processing node:', e);
        }
    }

    /**
     * FLUSH BATCH: Process pending nodes with size limit
     */
    function processBatch() {
        rafScheduled = false;
        
        if (!isEnabled || pendingNodes.length === 0) {
            pendingNodes = [];
            return;
        }

        // Process up to MAX_BATCH_SIZE nodes per frame
        const batch = pendingNodes.splice(0, CONFIG.MAX_BATCH_SIZE);
        
        for (let i = 0; i < batch.length; i++) {
            processTextNode(batch[i]);
        }

        // If there are still pending nodes, schedule another batch
        if (pendingNodes.length > 0) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    /**
     * Queue a node for processing (with overflow protection)
     */
    function queueNode(node) {
        // Prevent queue overflow
        if (pendingNodes.length > 1000) {
            console.warn('[Bionic Reading] Queue overflow, skipping nodes');
            return;
        }
        
        pendingNodes.push(node);
        
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    /**
     * Process text nodes in an element (optimized TreeWalker)
     */
    function processElement(element) {
        if (!element || shouldSkipNode(element)) return;
        
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Filter out empty/whitespace-only nodes during traversal
                    if (!node.nodeValue || REGEX.WHITESPACE.test(node.nodeValue)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            queueNode(node);
        }
    }

    // -------------------------------------------------------------------------
    // 4. STYLING & REVERT (OPTIMIZED)
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
            if (span.parentNode) {
                const text = span.textContent;
                const textNode = document.createTextNode(text);
                span.parentNode.replaceChild(textNode, span);
            }
        }
        removeStyles();
    }

    /**
     * Initial scan of existing content (optimized)
     */
    function processExistingContent() {
        const blocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        blocks.forEach(block => processElement(block));
    }

    // -------------------------------------------------------------------------
    // 5. OBSERVER (OPTIMIZED - TARGETED OBSERVATION)
    // -------------------------------------------------------------------------

    /**
     * Setup observer for a specific response block (not entire document!)
     */
    function observeResponseBlock(block) {
        if (responseBlockCache.has(block)) return; // Already observing
        responseBlockCache.add(block);

        const blockObserver = new MutationObserver((mutations) => {
            if (!isEnabled) return;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        if (node.nodeType === Node.TEXT_NODE) {
                            queueNode(node);
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            processElement(node);
                        }
                    }
                }
            }
        });

        blockObserver.observe(block, {
            childList: true,
            subtree: true,
        });

        // Store observer for cleanup
        block._bionicObserver = blockObserver;
    }

    /**
     * Setup global observer to detect new response blocks
     */
    function setupGlobalObserver() {
        if (observer) observer.disconnect();

        // Use Intersection Observer for existing blocks (lazy loading)
        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isEnabled) {
                    observeResponseBlock(entry.target);
                    processElement(entry.target);
                }
            });
        }, { rootMargin: '100px' });

        // Observe existing blocks
        const existingBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        existingBlocks.forEach(block => intersectionObserver.observe(block));

        // Lightweight observer for NEW response blocks only
        observer = new MutationObserver((mutations) => {
            if (!isEnabled) return;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if it IS a response block
                            if (node.matches && node.matches(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                                intersectionObserver.observe(node);
                            }
                            // Or check if it CONTAINS response blocks
                            const blocks = node.querySelectorAll?.(CONFIG.SELECTORS.RESPONSE_BLOCK);
                            if (blocks) {
                                blocks.forEach(block => intersectionObserver.observe(block));
                            }
                        }
                    }
                }
            }
        });

        // Only observe document body for NEW response blocks (much lighter)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Cleanup all observers
     */
    function disconnectObservers() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }
        
        // Disconnect individual block observers
        responseBlockCache.forEach(block => {
            if (block._bionicObserver) {
                block._bionicObserver.disconnect();
                delete block._bionicObserver;
            }
        });
        responseBlockCache.clear();
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
            setupGlobalObserver();
            processExistingContent();
        } else {
            showToast('📖 Bionic Reading: OFF');
            disconnectObservers();
            revertAllProcessing();
            pendingNodes = []; // Clear pending queue
        }
    }

    function init() {
        console.log('[Bionic Reading] Initializing v3.0 (Optimized for Memory & Performance)...');

        // Keyboard Shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                toggleExtension();
            }
        });

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
            setTimeout(() => {
                setupGlobalObserver();
                processExistingContent();
            }, 500);
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            disconnectObservers();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
