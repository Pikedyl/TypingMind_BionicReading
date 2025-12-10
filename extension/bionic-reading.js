/**
 * Bionic Reading for TypingMind - V3.2 EFFICIENCY POLISH
 * 
 * An extension that applies Bionic Reading formatting to AI responses in TypingMind.
 * Optimized for neurodivergent readers (ADHD/Dyslexia) using a 43% fixation point algorithm.
 * 
 * Features:
 * - Neurodivergent-optimized algorithm (43% fixation ratio)
 * - Preserves code blocks (```...```) and inline code (`...`)
 * - Minimal UI: Toggle with Ctrl+Shift+B (or Cmd+Shift+B on Mac)
 * - Safe handling of Unicode, URLs, and edge cases
 * - Custom font support
 * - Performance Optimized: Targeted observation, efficient batching, minimal regex
 * - Stability Protection: Skips active streaming nodes to prevent UI crashes
 * 
 * V3.2 CHANGES:
 * - Replaced per-character timeouts with a single efficiency polling loop for streaming text
 * - Consolidated active node tracking to reduce memory churn
 * - Fixed hardcoded selectors
 * - Removed redundant debug file
 */

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ USER SETTINGS
    // =========================================================================
    const USER_SETTINGS = {
        FONT_FAMILY: '"Segoe UI Light", "Segoe UI", system-ui, -apple-system, sans-serif',
        BOLD_RATIO: 0.43,
        ENABLED_BY_DEFAULT: true,
        MAX_BATCH_SIZE: 50,
        
        // STABILITY SETTINGS
        STREAMING_DEBOUNCE_MS: 1000, // Wait 1s after last change to process active nodes
        
        // DEBUG SETTINGS
        DEBUG_MODE: false, // Set to true to enable console logs
    };

    // =========================================================================
    // 1. CONFIGURATION & LOGGER
    // =========================================================================

    const CONFIG = {
        STORAGE_KEY: 'typingmind_bionic_reading_enabled',
        BOLD_RATIO: USER_SETTINGS.BOLD_RATIO,
        FONT_FAMILY: USER_SETTINGS.FONT_FAMILY,
        ENABLED_BY_DEFAULT: USER_SETTINGS.ENABLED_BY_DEFAULT,
        MAX_BATCH_SIZE: USER_SETTINGS.MAX_BATCH_SIZE,
        STREAMING_DEBOUNCE_MS: USER_SETTINGS.STREAMING_DEBOUNCE_MS,
        
        SELECTORS: {
            RESPONSE_BLOCK: '[data-element-id="response-block"]',
            CODE_BLOCK: 'pre',
            INLINE_CODE: 'code',
            CURSOR: '.cursor', // Common cursor class in streaming text
        },
        
        IGNORE_TAGS: new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'BUTTON', 'NOSCRIPT']),
    };

    // Logger
    const logger = {
        log: (msg, ...args) => USER_SETTINGS.DEBUG_MODE && console.log(`[Bionic] ${msg}`, ...args),
        warn: (msg, ...args) => USER_SETTINGS.DEBUG_MODE && console.warn(`[Bionic] ${msg}`, ...args),
        error: (msg, ...args) => console.error(`[Bionic] ${msg}`, ...args),
    };

    // State management
    const storedState = localStorage.getItem(CONFIG.STORAGE_KEY);
    let isEnabled = storedState === null ? CONFIG.ENABLED_BY_DEFAULT : storedState === 'true';
    
    // Track processed nodes
    const processedNodes = new WeakSet();
    
    // Processing Queue
    let pendingNodes = [];
    let rafScheduled = false;
    let observer = null;
    let intersectionObserver = null;
    let styleElement = null;
    let responseBlockCache = new Set();
    
    // Stability Checker State
    const activeStreamingNodes = new Set(); // Nodes currently receiving updates
    const nodeLastUpdateMap = new WeakMap(); // Last update timestamp for nodes
    let stabilityCheckInterval = null;

    // Regex Patterns
    const REGEX = {
        WHITESPACE: /^\s*$/,
        SINGLE_CHAR: /^.$/,
        NUMERIC: /^\d+([.,]\d+)*%?$/,
        URL: /^(https?:\/\/|www\.|mailto:|tel:|ftp:)/i,
        VERSION: /^v?\d+\.\d+/i,
        UUID: /^[0-9a-f]{8}-/i,
        DATE: /^\d{1,4}[-/]\d{1,2}/,
        TIME: /^\d{1,2}:\d{2}/,
        WORD_PARTS: /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:[-''][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u,
    };

    // =========================================================================
    // 2. CORE ALGORITHM
    // =========================================================================

    function getBoldLength(wordLength) {
        if (wordLength <= 3) return 1;
        return Math.round(wordLength * CONFIG.BOLD_RATIO);
    }

    function shouldSkipWord(word) {
        if (word.length < 2) return true;
        if (REGEX.WHITESPACE.test(word)) return true;
        if (REGEX.NUMERIC.test(word)) return true;
        
        if (word.length > 4) {
            if (REGEX.URL.test(word)) return true;
            if (REGEX.VERSION.test(word)) return true;
            if (REGEX.UUID.test(word)) return true;
        }
        
        if (word.includes(':') && REGEX.TIME.test(word)) return true;
        if (word.includes('-') || word.includes('/')) {
            if (REGEX.DATE.test(word)) return true;
        }
        
        if (word.includes('.') && word.length < 20) {
            const parts = word.split('.');
            if (parts.length === 2 && parts[1].length <= 5 && /^[a-z0-9]+$/i.test(parts[1])) {
                return true;
            }
        }
        
        return false;
    }

    function processWord(word) {
        if (!word || shouldSkipWord(word)) return word;

        const match = word.match(REGEX.WORD_PARTS);
        if (!match) return word;

        const [_, prefix, core, suffix] = match;
        if (!core || core.length < 2) return word;
        
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

        const boldLen = getBoldLength(core.length);
        return `${prefix}<b>${core.slice(0, boldLen)}</b>${core.slice(boldLen)}${suffix}`;
    }

    function transformText(text) {
        if (!text || text.length < 3) return text;
        if (!/[\p{L}\p{N}]/u.test(text)) return text;
        
        const words = text.split(/(\s+)/);
        let result = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            result += /\s/.test(word) ? word : processWord(word);
        }
        
        return result;
    }

    // =========================================================================
    // 3. STABILITY & PROCESSING
    // =========================================================================

    function shouldSkipNode(node) {
        let current = node;
        let depth = 0;

        while (current && depth < 5) {
            if (!current.tagName) {
                current = current.parentNode;
                depth++;
                continue;
            }

            // Skip Ignored Tags
            if (CONFIG.IGNORE_TAGS.has(current.tagName)) return true;
            
            // Skip User Input & Notes
            if (current.dataset) {
                const elId = current.dataset.elementId;
                if (elId === 'user-note' || elId === 'message-input') return true;
            }
            
            // Skip Editable Areas
            if (current.contentEditable === 'true') return true;

            // Skip Already Processed
            if (current.className && current.className.includes('bionic-text-wrapper')) return true;
            
            // CRITICAL: Skip Active Streaming Cursor
            if (current.querySelector && current.querySelector(CONFIG.SELECTORS.CURSOR)) return true;
            if (current.classList && current.classList.contains(CONFIG.SELECTORS.CURSOR.substring(1))) return true;

            current = current.parentNode;
            depth++;
        }
        return false;
    }

    /**
     * Checks if a node is likely being streamed (last child of last element)
     */
    function isStreamingNode(node) {
        const parent = node.parentNode;
        if (!parent) return false;
        
        // If it's the last child, it might be streaming
        if (parent.lastChild === node) {
            // Check if parent is part of a response block
            const responseBlock = parent.closest(CONFIG.SELECTORS.RESPONSE_BLOCK);
            if (responseBlock) {
                // If it's the very last text node in the response block, assume streaming
                return true; 
            }
        }
        return false;
    }

    /**
     * Efficiently manage streaming node updates
     */
    function markNodeStreaming(node) {
        const now = Date.now();
        nodeLastUpdateMap.set(node, now);
        activeStreamingNodes.add(node);
        
        // Start the check loop if not running
        if (!stabilityCheckInterval) {
            stabilityCheckInterval = setInterval(checkStability, 200); // Check every 200ms
        }
    }

    /**
     * Single loop to check all streaming nodes for stability
     */
    function checkStability() {
        if (activeStreamingNodes.size === 0) {
            clearInterval(stabilityCheckInterval);
            stabilityCheckInterval = null;
            return;
        }

        const now = Date.now();
        
        for (const node of activeStreamingNodes) {
            const lastUpdate = nodeLastUpdateMap.get(node) || 0;
            
            // If node has been stable for long enough
            if (now - lastUpdate >= CONFIG.STREAMING_DEBOUNCE_MS) {
                // Remove from tracking
                activeStreamingNodes.delete(node);
                nodeLastUpdateMap.delete(node);
                
                // Queue for processing
                queueNode(node);
            }
        }
    }

    function processTextNode(node) {
        if (!node || !node.parentNode || processedNodes.has(node)) return;
        
        try {
            const text = node.nodeValue;
            if (!text || text.length < 3 || REGEX.WHITESPACE.test(text)) {
                processedNodes.add(node);
                return;
            }
            
            if (shouldSkipNode(node.parentNode)) return;

            // STABILITY CHECK: If node seems to be streaming, debounce it
            if (isStreamingNode(node)) {
                const now = Date.now();
                const lastSeen = nodeLastUpdateMap.get(node) || 0;
                
                if (now - lastSeen < CONFIG.STREAMING_DEBOUNCE_MS) {
                    markNodeStreaming(node);
                    return; 
                }
            }

            const bionicHtml = transformText(text);

            if (text !== bionicHtml && bionicHtml.includes('<b>')) {
                const span = document.createElement('span');
                span.className = 'bionic-text-wrapper';
                span.innerHTML = bionicHtml;
                
                // Double check parent before replacement
                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    processedNodes.add(span);
                    // Cleanup from tracking if it was there
                    activeStreamingNodes.delete(node);
                }
            } else {
                processedNodes.add(node);
            }
        } catch (e) {
            logger.error('Error processing node:', e);
        }
    }

    function processBatch() {
        rafScheduled = false;
        
        if (!isEnabled || pendingNodes.length === 0) {
            pendingNodes = [];
            return;
        }

        const batch = pendingNodes.splice(0, CONFIG.MAX_BATCH_SIZE);
        
        for (let i = 0; i < batch.length; i++) {
            processTextNode(batch[i]);
        }

        // Re-schedule if nodes remain
        if (pendingNodes.length > 0) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    function queueNode(node) {
        if (pendingNodes.length > 1000) {
            // Safety valve: Drop oldest nodes if queue is too full
            pendingNodes.splice(0, 100); 
            logger.warn('Queue overflow, dropped 100 nodes');
        }
        
        pendingNodes.push(node);
        
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    function processElement(element) {
        if (!element || shouldSkipNode(element)) return;
        
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
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

    // =========================================================================
    // 4. OBSERVERS & EVENTS
    // =========================================================================

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

    function processExistingContent() {
        const blocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        blocks.forEach(block => processElement(block));
    }

    function observeResponseBlock(block) {
        if (responseBlockCache.has(block)) return;
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
                // Handle text updates (streaming)
                else if (mutation.type === 'characterData') {
                    // Update timestamp for this node
                    markNodeStreaming(mutation.target);
                }
            }
        });

        blockObserver.observe(block, {
            childList: true,
            subtree: true,
            characterData: true // Needed to detect streaming updates
        });

        block._bionicObserver = blockObserver;
    }

    function setupGlobalObserver() {
        if (observer) observer.disconnect();

        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isEnabled) {
                    observeResponseBlock(entry.target);
                    processElement(entry.target);
                }
            });
        }, { rootMargin: '100px' });

        const existingBlocks = document.querySelectorAll(CONFIG.SELECTORS.RESPONSE_BLOCK);
        existingBlocks.forEach(block => intersectionObserver.observe(block));

        observer = new MutationObserver((mutations) => {
            if (!isEnabled) return;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && node.matches(CONFIG.SELECTORS.RESPONSE_BLOCK)) {
                                intersectionObserver.observe(node);
                            }
                            const blocks = node.querySelectorAll?.(CONFIG.SELECTORS.RESPONSE_BLOCK);
                            if (blocks) {
                                blocks.forEach(block => intersectionObserver.observe(block));
                            }
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function disconnectObservers() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }
        if (stabilityCheckInterval) {
            clearInterval(stabilityCheckInterval);
            stabilityCheckInterval = null;
        }
        activeStreamingNodes.clear();
        
        responseBlockCache.forEach(block => {
            if (block._bionicObserver) {
                block._bionicObserver.disconnect();
                delete block._bionicObserver;
            }
        });
        responseBlockCache.clear();
    }

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
        logger.log('Initializing v3.2 Efficiency Polish...');

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                toggleExtension();
            }
        });

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

        if (isEnabled) {
            injectStyles();
            setTimeout(() => {
                setupGlobalObserver();
                processExistingContent();
            }, 500);
        }

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
