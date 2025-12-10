# Changelog

## V3.1 - Stability & Crash Protection (December 2025)

### 🛡️ Critical Fixes
- **Stable Node Detection**: Now detects and ignores active streaming text nodes to prevent React UI crashes
- **Streaming Debounce**: Added 1000ms debounce for rapidly changing text to prevent "artifacting" during generation
- **Conflict Prevention**: Improved checks to ensure we don't interfere with TypingMind's virtual DOM updates
- **Queue Safety**: Added stricter overflow protection to drop old nodes if processing gets backed up

### 🔧 Improvements
- **Integrated Debugger**: Added lightweight logging infrastructure (hidden by default) for easier troubleshooting
- **Heuristic Streaming Detection**: Smarter detection of which node is currently being typed by the AI
- **Error Boundaries**: Enhanced try-catch blocks around all DOM manipulations to prevent page-wide crashes

---

## V3.0 - Performance & Memory Optimization (December 2025)

### 🚀 Major Performance Improvements

**Memory Optimization:**
- **Targeted MutationObserver**: Changed from observing entire `document.body` to observing only specific response blocks
- **Intersection Observer**: Implements lazy loading for off-screen content - only processes visible response blocks
- **Queue Overflow Protection**: Added `MAX_BATCH_SIZE` limit (50 nodes/frame) to prevent infinite queue growth
- **Proper Cleanup**: All observers now properly disconnect when disabled or on page unload
- **Cache Management**: Added `responseBlockCache` to track which blocks are being observed

**CPU Optimization:**
- **Optimized Regex Order**: Reordered regex patterns to check most common cases first (whitespace, numbers) before expensive patterns
- **Early Returns**: `shouldSkipWord()` now uses conditional checks to avoid unnecessary regex operations
- **Reduced String Allocation**: Changed from `.map()` + `.join()` to string concatenation in hot paths
- **Efficient TreeWalker**: Added `acceptNode` filter to reject empty/whitespace nodes during traversal
- **Removed Redundant Checks**: Consolidated duplicate conditions and removed unnecessary operations

**Architectural Changes:**
- **Multi-Level Observation**: 
  - Global observer detects new response blocks
  - Intersection observer handles lazy loading
  - Individual block observers handle mutations within blocks
- **Batch Processing Improvements**: 
  - Process max 50 nodes per frame (configurable)
  - Automatically schedules continuation if queue remains
- **Better Node Filtering**: TreeWalker now filters during traversal instead of after

### 📊 Performance Metrics

| Metric | V2.0 (Old) | V3.0 (New) | Improvement |
|--------|------------|------------|-------------|
| Observers Active | 1 (entire body) | 1 + N (per block) | Targeted |
| Memory Leak Risk | Medium | Low | Proper cleanup |
| Queue Overflow | Possible | Protected | Max 1000 items |
| Regex Checks/Word | 10+ | 2-4 avg | 60% reduction |
| Off-screen Processing | Immediate | Lazy | On-demand only |
| Observer Cleanup | Manual | Automatic | Built-in |

### 🐛 Bug Fixes
- Fixed memory leak from observers not being disconnected
- Fixed potential infinite queue growth during streaming
- Fixed excessive regex checks on every word
- Fixed TreeWalker processing empty text nodes
- Added proper cleanup on page unload

### ⚙️ New Configuration
- `MAX_BATCH_SIZE`: Control how many nodes process per frame (default: 50)

### 🔄 Migration from V2.0
No breaking changes - settings are preserved. Simply update the extension URL and refresh.

---

## V2.0 - Optimized Architecture (Previous)

### Changes from V1.0
- Switched from `characterData` observation to `childList` only
- Implemented micro-batching with requestAnimationFrame
- Added WeakSet for tracking processed nodes
- Removed inline styles in favor of CSS injection
- Improved regex patterns for edge cases

---

## V1.0 - Initial Release

- Basic bionic reading implementation
- Toggle with keyboard shortcut
- Custom font support
- Code block preservation
