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

        // PROCESSING DELAY: Milliseconds to wait before processing streaming text
        // Lower = faster updates but more CPU usage. Default: 100
        DEBOUNCE_MS: 100,
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
        DEBOUNCE_MS: USER_SETTINGS.DEBOUNCE_MS,
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
    // Use user's default preference if no stored state exists
    const storedState = localStorage.getItem(CONFIG.STORAGE_KEY);
    let isEnabled = storedState === null ? CONFIG.ENABLED_BY_DEFAULT : storedState === 'true';
    
    let processingTimeout = null;
    let observer = null;
    let isProcessing = false;

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
     */
    function processWord(word) {
        // 1. Skip empty or purely whitespace
        if (!word || !word.trim()) return word;

        // 2. Skip URLs
        if (word.match(/^(https?:\/\/|www\.)/i)) return word;

        // 3. Separate punctuation from the actual word part
        // Match leading punctuation, core word, trailing punctuation
        // Unicode-aware regex for letters/numbers
        const match = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u);

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
     */
    function transformText(text) {
        // Split by whitespace but keep the delimiters to preserve exact spacing
        // This regex splits by space/newline but captures the separators
        const parts = text.split(/(\s+)/);
        
        return parts.map(part => {
            // If it's whitespace, return as is
            if (part.match(/^\s+$/)) return part;
            return processWord(part);
        }).join('');
    }

    // -------------------------------------------------------------------------
    // 3. DOM MANIPULATION
    // -------------------------------------------------------------------------

    /**
     * Checks if an element or its ancestors are code blocks.
     */
    function shouldSkipNode(node) {
        let current = node;
        while (current && current !== document.body) {
            if (current.tagName && CONFIG.IGNORE_TAGS.has(current.tagName)) {
                return true;
            }
            // Check for specific TypingMind code block classes if necessary
            // Usually <pre> and <code> covers it
            current = current.parentNode;
        }
        return false;
    }

    /**
     * Processes a specific DOM element (Response Block).
     */
    function processBlock(block) {
        // Mark as processed to prevent infinite loops if we were observing attributes (we aren't, but good practice)
        if (block.dataset.bionicProcessed === 'true') return;

        // 1. Create TreeWalker to find all text nodes
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip empty text nodes
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
                    // Skip if inside code block
                    if (shouldSkipNode(node.parentNode)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let currentNode;
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        // 2. Process text nodes
        // We do this in a second pass to avoid messing up the walker while modifying the tree
        textNodes.forEach(node => {
            // Double check parent hasn't changed (unlikely but possible)
            if (shouldSkipNode(node.parentNode)) return;

            // Store original text for restoration
            // We use a custom property on the parent element to store original structure if needed
            // For simplicity in this v1, we just replace. Restoration will reload page or we can implement complex revert.
            // To allow "Toggle Off", we should probably wrap our changes in a simplified way or just accept that "Off" requires page refresh/re-generation?
            // "Revert" is hard with HTML injection. 
            // Better approach for Toggle: 
            // - If ON: Apply processing
            // - If OFF: We might need to reload or re-render. 
            // Let's implement a robust "Restore" by saving original text in a data attribute?
            // No, that's too much memory.
            // Let's settle for: Toggle ON applies it. Toggle OFF stops applying to NEW messages. 
            // To clear existing, we'd ideally reload. But let's try to do it right:
            // We wrap our changes in <span class="bionic-word">...</span>?
            
            // Simpler approach for V1:
            // Just replace the text. If user toggles OFF, they might see mixed content until refresh.
            // Wait, the plan said "Process/revert existing messages". 
            // To revert, we need to strip the <b> tags we added.
            
            const text = node.nodeValue;
            const bionicHtml = transformText(text);
            
            // Only touch DOM if transformation actually changed something
            if (text !== bionicHtml) {
                const span = document.createElement('span');
                span.className = 'bionic-text-wrapper';
                span.innerHTML = bionicHtml;
                span.dataset.originalText = text; // Save for revert
                
                node.parentNode.replaceChild(span, node);
            }
        });

        block.dataset.bionicProcessed = 'true';
    }

    /**
     * Reverts a block to its original state.
     */
    function revertBlock(block) {
        // Find all our wrappers
        const wrappers = block.querySelectorAll('.bionic-text-wrapper');
        wrappers.forEach(span => {
            const originalText = span.dataset.originalText;
            if (originalText) {
                const textNode = document.createTextNode(originalText);
                span.parentNode.replaceChild(textNode, span);
            } else {
                // Fallback: strip bold tags
                const text = span.textContent;
                const textNode = document.createTextNode(text);
                span.parentNode.replaceChild(textNode, span);
            }
        });
        delete block.dataset.bionicProcessed;
    }

    /**
     * Main processing function (Debounced).
     */
    function runBionicProcessing() {
        if (!isEnabled || isProcessing) return;
        isProcessing = true;

        try {
            const responseBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
            responseBlocks.forEach(block => {
                // Apply custom font if configured
                if (CONFIG.FONT_FAMILY) {
                    block.style.fontFamily = CONFIG.FONT_FAMILY;
                }
                
                // Only process bionic formatting if not already processed
                if (block.dataset.bionicProcessed !== 'true') {
                    processBlock(block);
                }
            });
        } catch (e) {
            console.error('[Bionic Reading] Error processing blocks:', e);
        } finally {
            isProcessing = false;
        }
    }

    function revertAllProcessing() {
        const responseBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        responseBlocks.forEach(block => revertBlock(block));
    }

    /**
     * Applies custom font to all response blocks.
     */
    function applyCustomFont() {
        if (!CONFIG.FONT_FAMILY) return;
        
        const responseBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        responseBlocks.forEach(block => {
            block.style.fontFamily = CONFIG.FONT_FAMILY;
        });
    }

    /**
     * Removes custom font from all response blocks.
     */
    function removeCustomFont() {
        const responseBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        responseBlocks.forEach(block => {
            block.style.fontFamily = '';
        });
    }

    // -------------------------------------------------------------------------
    // 4. EVENT LISTENERS & OBSERVERS
    // -------------------------------------------------------------------------

    // Track pending blocks for batch processing
    let pendingBlocks = new Set();

    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver((mutations) => {
            if (!isEnabled) {
                // Clear any pending blocks when disabled to prevent memory leaks
                pendingBlocks.clear();
                return;
            }

            // Collect only affected response blocks from mutations
            for (const mutation of mutations) {
                // Find the response block ancestor for the mutation target
                let target = mutation.target;
                while (target && target !== document.body) {
                    if (target.matches && target.matches(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                        // Only add if not already fully processed
                        // For streaming, we need to re-process blocks that have new content
                        pendingBlocks.add(target);
                        break;
                    }
                    target = target.parentNode;
                }

                // Also check added nodes for new response blocks
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                            pendingBlocks.add(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK).forEach(b => pendingBlocks.add(b));
                        }
                    }
                });
            }

            if (pendingBlocks.size > 0) {
                clearTimeout(processingTimeout);
                
                // If too many blocks pending, process immediately to prevent memory buildup
                if (pendingBlocks.size > 20) {
                    processPendingBlocks();
                } else {
                    processingTimeout = setTimeout(processPendingBlocks, CONFIG.DEBOUNCE_MS);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Process only the blocks that have pending changes.
     * More efficient than querying all blocks on every mutation.
     */
    function processPendingBlocks() {
        if (!isEnabled || isProcessing) return;
        isProcessing = true;

        try {
            pendingBlocks.forEach(block => {
                // Verify block is still in DOM
                if (!document.contains(block)) {
                    pendingBlocks.delete(block);
                    return;
                }

                // Apply custom font if configured
                if (CONFIG.FONT_FAMILY) {
                    block.style.fontFamily = CONFIG.FONT_FAMILY;
                }

                // For streaming content, we need to process new text nodes
                // even if block was previously processed
                processBlockIncremental(block);
            });
            pendingBlocks.clear();
        } catch (e) {
            console.error('[Bionic Reading] Error processing pending blocks:', e);
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Incrementally process a block - only processes unprocessed text nodes.
     * This allows re-processing streaming blocks without re-doing everything.
     */
    function processBlockIncremental(block) {
        // Create TreeWalker to find all text nodes
        const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip empty text nodes
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
                    // Skip if inside code block
                    if (shouldSkipNode(node.parentNode)) return NodeFilter.FILTER_REJECT;
                    // Skip if already inside our wrapper
                    if (node.parentNode.classList && node.parentNode.classList.contains('bionic-text-wrapper')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let currentNode;
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        // Process text nodes (TreeWalker already filtered, so minimal checks needed)
        textNodes.forEach(node => {
            const text = node.nodeValue;
            const bionicHtml = transformText(text);

            // Only touch DOM if transformation actually changed something
            if (text !== bionicHtml) {
                const span = document.createElement('span');
                span.className = 'bionic-text-wrapper';
                span.innerHTML = bionicHtml;
                span.dataset.originalText = text;

                node.parentNode.replaceChild(span, node);
            }
        });

        // Mark as processed (for full revert tracking)
        block.dataset.bionicProcessed = 'true';
    }

    // -------------------------------------------------------------------------
    // 5. CHAT COMMANDS (Mobile Support)
    // -------------------------------------------------------------------------

    function setupChatCommand() {
        // We need to attach to the textarea. It might not exist immediately.
        // We'll use a delegation approach or polling if needed, but delegation on body is safer for dynamic elements.
        
        document.body.addEventListener('keydown', (e) => {
            // Only care about Enter key (without Shift)
            if (e.key === 'Enter' && !e.shiftKey) {
                const target = e.target;
                
                // Check if it's the chat input
                if (target.tagName === 'TEXTAREA' && 
                   (target.dataset.elementId === 'chat-input-textbox' || target.id === 'chat-input-textbox')) {
                    
                    const value = target.value.trim();
                    
                    // Check for magic command
                    if (value.toLowerCase() === '/bionic') {
                        // Prevent sending to AI
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Clear input
                        target.value = '';
                        
                        // Trigger React/Framework change events so the UI knows it's empty
                        // TypingMind uses React, so we need to hack the value setter if possible, 
                        // or just simple clear might work if we trigger input event.
                        const event = new Event('input', { bubbles: true });
                        target.dispatchEvent(event);
                        
                        // Toggle feature
                        toggleExtension();
                    }
                }
            }
        }, { capture: true }); // Capture phase to intercept before TypingMind handles it
    }

    // -------------------------------------------------------------------------
    // 6. UI & NOTIFICATIONS
    // -------------------------------------------------------------------------

    function showToast(message) {
        // Remove existing toast
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
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #374151;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after delay
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
            runBionicProcessing();
        } else {
            showToast('📖 Bionic Reading: OFF');
            revertAllProcessing();
            removeCustomFont();
        }
    }

    function init() {
        console.log('[Bionic Reading] Initializing...');

        // 1. Keyboard Shortcut
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl+Shift+B (or Cmd+Shift+B)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                toggleExtension();
            }
        });

        // 2. Setup MutationObserver
        setupObserver();
        
        // 3. Setup Chat Command (for Mobile)
        setupChatCommand();

        // 4. Initial Run (if enabled)
        if (isEnabled) {
            // Quick initial processing
            setTimeout(runBionicProcessing, 100);
        }

        console.log('[Bionic Reading] Ready. Use Ctrl+Shift+B or type "/bionic" to toggle.');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
