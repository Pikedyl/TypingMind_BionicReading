/**
 * Bionic Reading for TypingMind - V3.0 OPTIMIZED + DEBUG MODE
 * 
 * This version includes comprehensive logging and memory monitoring capabilities.
 * 
 * DEBUG FEATURES:
 * - Console logging with categories (ERROR, WARN, INFO, PERF)
 * - Memory usage tracking via Performance API
 * - Live stats panel (toggle with Ctrl+Shift+D)
 * - Export logs functionality
 * - Queue size monitoring
 * - Processing time tracking
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
        
        // DEBUG SETTINGS
        DEBUG_MODE: true, // Set to false to disable all debug features
        LOG_LEVEL: 'INFO', // 'ERROR', 'WARN', 'INFO', 'PERF'
        SHOW_MEMORY_STATS: true,
        MEMORY_CHECK_INTERVAL: 5000, // Check memory every 5 seconds
    };

    // =========================================================================
    // DEBUG LOGGER
    // =========================================================================
    
    const LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        PERF: 3,
    };

    class BionicLogger {
        constructor() {
            this.logs = [];
            this.maxLogs = 1000;
            this.startTime = Date.now();
            this.stats = {
                nodesProcessed: 0,
                batchesProcessed: 0,
                queueOverflows: 0,
                errors: 0,
                processingTimeTotal: 0,
                memorySnapshots: [],
            };
        }

        log(level, category, message, data = null) {
            if (!USER_SETTINGS.DEBUG_MODE) return;
            if (LOG_LEVELS[level] > LOG_LEVELS[USER_SETTINGS.LOG_LEVEL]) return;

            const logEntry = {
                timestamp: Date.now() - this.startTime,
                level,
                category,
                message,
                data,
            };

            this.logs.push(logEntry);
            if (this.logs.length > this.maxLogs) {
                this.logs.shift(); // Remove oldest
            }

            // Console output
            const prefix = `[Bionic ${level}]`;
            const timeStr = `+${(logEntry.timestamp / 1000).toFixed(2)}s`;
            const msg = `${prefix} ${timeStr} [${category}] ${message}`;
            
            switch(level) {
                case 'ERROR':
                    console.error(msg, data || '');
                    this.stats.errors++;
                    break;
                case 'WARN':
                    console.warn(msg, data || '');
                    break;
                case 'INFO':
                    console.log(msg, data || '');
                    break;
                case 'PERF':
                    console.log(`%c${msg}`, 'color: #10b981', data || '');
                    break;
            }
        }

        error(category, message, data) {
            this.log('ERROR', category, message, data);
        }

        warn(category, message, data) {
            this.log('WARN', category, message, data);
        }

        info(category, message, data) {
            this.log('INFO', category, message, data);
        }

        perf(category, message, data) {
            this.log('PERF', category, message, data);
        }

        recordProcessing(nodeCount, timeMs) {
            this.stats.nodesProcessed += nodeCount;
            this.stats.batchesProcessed++;
            this.stats.processingTimeTotal += timeMs;
        }

        recordQueueOverflow() {
            this.stats.queueOverflows++;
        }

        recordMemory() {
            if (!performance.memory) return;
            
            const mem = {
                timestamp: Date.now() - this.startTime,
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            };
            
            this.stats.memorySnapshots.push(mem);
            
            // Keep only last 100 snapshots
            if (this.stats.memorySnapshots.length > 100) {
                this.stats.memorySnapshots.shift();
            }

            return mem;
        }

        getStats() {
            const avgProcessingTime = this.stats.batchesProcessed > 0 
                ? (this.stats.processingTimeTotal / this.stats.batchesProcessed).toFixed(2)
                : 0;

            return {
                ...this.stats,
                avgProcessingTime: parseFloat(avgProcessingTime),
                uptime: Date.now() - this.startTime,
            };
        }

        exportLogs() {
            const exportData = {
                extension: 'Bionic Reading v3.0',
                exportTime: new Date().toISOString(),
                stats: this.getStats(),
                logs: this.logs,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bionic-reading-logs-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.info('EXPORT', 'Logs exported successfully');
        }

        clearLogs() {
            this.logs = [];
            this.stats = {
                nodesProcessed: 0,
                batchesProcessed: 0,
                queueOverflows: 0,
                errors: 0,
                processingTimeTotal: 0,
                memorySnapshots: [],
            };
            this.info('SYSTEM', 'Logs cleared');
        }
    }

    const logger = new BionicLogger();

    // =========================================================================
    // DEBUG PANEL UI
    // =========================================================================

    class DebugPanel {
        constructor() {
            this.panel = null;
            this.isVisible = false;
            this.updateInterval = null;
        }

        toggle() {
            this.isVisible = !this.isVisible;
            
            if (this.isVisible) {
                this.show();
            } else {
                this.hide();
            }
        }

        show() {
            if (this.panel) {
                this.panel.style.display = 'block';
                this.startUpdating();
                return;
            }

            this.panel = document.createElement('div');
            this.panel.id = 'bionic-debug-panel';
            this.panel.innerHTML = `
                <div style="
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.95);
                    color: #00ff00;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    padding: 15px;
                    border-radius: 8px;
                    z-index: 999999;
                    min-width: 350px;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
                    border: 1px solid #00ff00;
                ">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #00ff00; padding-bottom: 8px;">
                        <strong style="color: #00ff00;">🔬 BIONIC READING DEBUG</strong>
                        <button id="bionic-debug-close" style="background: none; border: none; color: #00ff00; cursor: pointer; font-size: 16px;">✕</button>
                    </div>
                    <div id="bionic-debug-content" style="line-height: 1.6;"></div>
                    <div style="margin-top: 10px; border-top: 1px solid #00ff00; padding-top: 8px; display: flex; gap: 8px;">
                        <button id="bionic-debug-export" style="flex: 1; background: #00ff00; color: black; border: none; padding: 5px; cursor: pointer; border-radius: 4px; font-size: 10px;">📥 Export Logs</button>
                        <button id="bionic-debug-clear" style="flex: 1; background: #ff6b00; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 4px; font-size: 10px;">🗑️ Clear Logs</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.panel);

            document.getElementById('bionic-debug-close').addEventListener('click', () => this.hide());
            document.getElementById('bionic-debug-export').addEventListener('click', () => logger.exportLogs());
            document.getElementById('bionic-debug-clear').addEventListener('click', () => {
                logger.clearLogs();
                this.update();
            });

            this.startUpdating();
        }

        hide() {
            if (this.panel) {
                this.panel.style.display = 'none';
            }
            this.stopUpdating();
        }

        startUpdating() {
            this.update();
            this.updateInterval = setInterval(() => this.update(), 1000);
        }

        stopUpdating() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }

        formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        formatTime(ms) {
            if (ms < 1000) return `${ms}ms`;
            const seconds = Math.floor(ms / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes}m ${secs}s`;
        }

        update() {
            if (!this.panel || !this.isVisible) return;

            const stats = logger.getStats();
            const mem = logger.recordMemory();
            
            let html = `
                <div style="color: #ffff00;">⚡ STATUS</div>
                <div style="margin-left: 10px;">
                    Extension: <span style="color: ${isEnabled ? '#00ff00' : '#ff0000'}">${isEnabled ? 'ENABLED' : 'DISABLED'}</span><br>
                    Uptime: ${this.formatTime(stats.uptime)}<br>
                    Queue Size: <span style="color: ${pendingNodes.length > 500 ? '#ff0000' : '#00ff00'}">${pendingNodes.length}</span><br>
                    Observed Blocks: ${responseBlockCache.size}
                </div>
                <br>
                <div style="color: #ffff00;">📊 PROCESSING</div>
                <div style="margin-left: 10px;">
                    Nodes Processed: ${stats.nodesProcessed}<br>
                    Batches: ${stats.batchesProcessed}<br>
                    Avg Batch Time: ${stats.avgProcessingTime}ms<br>
                    Queue Overflows: <span style="color: ${stats.queueOverflows > 0 ? '#ff6b00' : '#00ff00'}">${stats.queueOverflows}</span><br>
                    Errors: <span style="color: ${stats.errors > 0 ? '#ff0000' : '#00ff00'}">${stats.errors}</span>
                </div>
            `;

            if (mem && USER_SETTINGS.SHOW_MEMORY_STATS) {
                const usedPercent = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1);
                const usedColor = usedPercent > 80 ? '#ff0000' : usedPercent > 60 ? '#ff6b00' : '#00ff00';
                
                html += `
                    <br>
                    <div style="color: #ffff00;">💾 MEMORY</div>
                    <div style="margin-left: 10px;">
                        Used: <span style="color: ${usedColor}">${this.formatBytes(mem.usedJSHeapSize)}</span> (${usedPercent}%)<br>
                        Total: ${this.formatBytes(mem.totalJSHeapSize)}<br>
                        Limit: ${this.formatBytes(mem.jsHeapSizeLimit)}
                    </div>
                `;
            }

            html += `
                <br>
                <div style="color: #ffff00;">📝 RECENT LOGS (${logger.logs.length}/${logger.maxLogs})</div>
                <div style="margin-left: 10px; max-height: 150px; overflow-y: auto; font-size: 9px;">
            `;

            const recentLogs = logger.logs.slice(-10).reverse();
            recentLogs.forEach(log => {
                const color = log.level === 'ERROR' ? '#ff0000' : 
                             log.level === 'WARN' ? '#ff6b00' : 
                             log.level === 'PERF' ? '#10b981' : '#00ff00';
                html += `<div style="color: ${color}; margin-bottom: 2px;">[${(log.timestamp/1000).toFixed(1)}s] ${log.category}: ${log.message}</div>`;
            });

            html += `</div>`;

            const content = document.getElementById('bionic-debug-content');
            if (content) {
                content.innerHTML = html;
            }
        }
    }

    const debugPanel = new DebugPanel();

    // =========================================================================
    // MAIN CODE WITH LOGGING
    // =========================================================================

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
        IGNORE_TAGS: new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'BUTTON', 'NOSCRIPT']),
    };

    const storedState = localStorage.getItem(CONFIG.STORAGE_KEY);
    let isEnabled = storedState === null ? CONFIG.ENABLED_BY_DEFAULT : storedState === 'true';
    
    const processedNodes = new WeakSet();
    let pendingNodes = [];
    let rafScheduled = false;
    let observer = null;
    let intersectionObserver = null;
    let styleElement = null;
    let responseBlockCache = new Set();

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

    // Same core functions but with logging...
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

    function shouldSkipNode(node) {
        let current = node;
        let depth = 0;
        while (current && depth < 5) {
            if (!current.tagName) {
                current = current.parentNode;
                depth++;
                continue;
            }
            if (CONFIG.IGNORE_TAGS.has(current.tagName)) return true;
            if (current.dataset) {
                const elId = current.dataset.elementId;
                if (elId === 'user-note' || elId === 'message-input') return true;
            }
            if (current.contentEditable === 'true') return true;
            if (current.className && current.className.includes('bionic-text-wrapper')) return true;
            current = current.parentNode;
            depth++;
        }
        return false;
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
            const bionicHtml = transformText(text);
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
            logger.error('PROCESS', 'Error processing text node', e.message);
        }
    }

    function processBatch() {
        rafScheduled = false;
        if (!isEnabled || pendingNodes.length === 0) {
            pendingNodes = [];
            return;
        }

        const startTime = performance.now();
        const batch = pendingNodes.splice(0, CONFIG.MAX_BATCH_SIZE);
        
        for (let i = 0; i < batch.length; i++) {
            processTextNode(batch[i]);
        }

        const processingTime = performance.now() - startTime;
        logger.recordProcessing(batch.length, processingTime);
        logger.perf('BATCH', `Processed ${batch.length} nodes in ${processingTime.toFixed(2)}ms`);

        if (pendingNodes.length > 0) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    function queueNode(node) {
        if (pendingNodes.length > 1000) {
            logger.recordQueueOverflow();
            logger.warn('QUEUE', 'Queue overflow detected, skipping nodes');
            return;
        }
        pendingNodes.push(node);
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(processBatch);
        }
    }

    function processElement(element) {
        if (!element || shouldSkipNode(element)) return;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.nodeValue || REGEX.WHITESPACE.test(node.nodeValue)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let node;
        while (node = walker.nextNode()) {
            queueNode(node);
        }
    }

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
        logger.info('STYLE', 'Custom font styles injected');
    }

    function removeStyles() {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
            logger.info('STYLE', 'Custom font styles removed');
        }
    }

    function revertAllProcessing() {
        const wrappers = document.querySelectorAll('.bionic-text-wrapper');
        logger.info('REVERT', `Reverting ${wrappers.length} processed nodes`);
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
        logger.info('INIT', `Processing ${blocks.length} existing response blocks`);
        blocks.forEach(block => processElement(block));
    }

    function observeResponseBlock(block) {
        if (responseBlockCache.has(block)) return;
        responseBlockCache.add(block);
        logger.info('OBSERVER', 'Started observing new response block');

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

        blockObserver.observe(block, { childList: true, subtree: true });
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
        logger.info('OBSERVER', `Intersection observer setup for ${existingBlocks.length} blocks`);

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

        observer.observe(document.body, { childList: true, subtree: true });
        logger.info('OBSERVER', 'Global observer setup complete');
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
        responseBlockCache.forEach(block => {
            if (block._bionicObserver) {
                block._bionicObserver.disconnect();
                delete block._bionicObserver;
            }
        });
        responseBlockCache.clear();
        logger.info('OBSERVER', 'All observers disconnected');
    }

    function showToast(message) {
        const existing = document.getElementById('bionic-reading-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'bionic-reading-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px;
            background: #1f2937; color: #f3f4f6; padding: 12px 20px;
            border-radius: 8px; z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px; font-weight: 500;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #374151; opacity: 0;
            transform: translateY(10px); transition: opacity 0.3s, transform 0.3s;
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
        logger.info('TOGGLE', `Extension ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

        if (isEnabled) {
            showToast('📖 Bionic Reading: ON');
            injectStyles();
            setupGlobalObserver();
            processExistingContent();
        } else {
            showToast('📖 Bionic Reading: OFF');
            disconnectObservers();
            revertAllProcessing();
            pendingNodes = [];
        }
    }

    function init() {
        logger.info('INIT', 'Bionic Reading v3.0 DEBUG MODE starting...');

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+B - Toggle extension
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                toggleExtension();
            }
            // Ctrl+Shift+D - Toggle debug panel
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                debugPanel.toggle();
                logger.info('DEBUG', `Debug panel ${debugPanel.isVisible ? 'shown' : 'hidden'}`);
            }
        });

        // Mobile Chat Command
        document.body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const target = e.target;
                if (target.tagName === 'TEXTAREA' && target.id === 'chat-input-textbox') {
                    const cmd = target.value.trim().toLowerCase();
                    if (cmd === '/bionic') {
                        e.preventDefault();
                        e.stopPropagation();
                        target.value = '';
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        toggleExtension();
                    } else if (cmd === '/bionic-debug') {
                        e.preventDefault();
                        e.stopPropagation();
                        target.value = '';
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        debugPanel.toggle();
                    }
                }
            }
        }, { capture: true });

        // Initial Run
        if (isEnabled) {
            injectStyles();
            setTimeout(() => {
                setupGlobalObserver();
                processExistingContent();
            }, 500);
        }

        // Memory monitoring
        if (USER_SETTINGS.SHOW_MEMORY_STATS && performance.memory) {
            setInterval(() => {
                logger.recordMemory();
            }, USER_SETTINGS.MEMORY_CHECK_INTERVAL);
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            logger.info('SYSTEM', 'Page unloading, cleaning up...');
            disconnectObservers();
        });

        logger.info('INIT', 'Initialization complete! Press Ctrl+Shift+D to open debug panel');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
