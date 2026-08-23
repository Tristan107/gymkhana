---
name: js-runtime-performance
description: High-performance guidelines for JavaScript, TypeScript, and Node.js execution, V8 optimization, non-blocking event loops, and memory efficiency.
---

# JavaScript & Node.js Runtime Performance Rules

When modifying, writing, or reviewing code, strictly enforce the following runtime optimizations prioritized by impact:

## 1. Hot-Path & V8 Execution (High Impact)
* **Keep Hidden Classes Monomorphic:** Always instantiate object parameters in identical shape and key order. Never use `delete obj.key` (causes V8 dictionary-mode fallback); set `obj.key = undefined` or use a `Map`.
* **Avoid Function Deoptimizations:** Keep functions small with uniform argument types so V8 JIT inline caching can optimize them.
* **Loop Efficiency:** In high-frequency hot paths, prefer standard counting `for` loops over `.forEach()`, `.reduce()`, or `.map()` to eliminate iterator function call overhead and unwanted allocations.

## 2. Event Loop & Async Overhead (High Impact)
* **Parallel Execution:** Avoid waterfall `await` statements. Combine independent promises with `Promise.all()` or `Promise.allSettled()`.
* **Prevent Main-Thread Blocking:** Never run intensive synchronous computations ($O(N^2)$ array operations, synchronous file I/O, heavy parsing) on the event loop. Offload to `worker_threads` or chunk long loops using `setImmediate()`.
* **Avoid Unnecessary Microtasks:** Do not wrap synchronous return values in unnecessary `async` functions or `Promise.resolve()` inside tight loops.

## 3. Memory Allocation & GC Pressure (Medium Impact)
* **Avoid Inline Allocation in Loops:** Do not instantiate arrays (`.concat()`, `.slice()`), functions, or objects inside hot loops. Pre-allocate arrays with known capacities or mutate in place where safe.
* **Use Typed Arrays for Raw Data:** Use `Buffer`, `Uint8Array`, or `Float64Array` instead of standard objects or dense arrays when manipulating numerical streams or binary payloads.
* **Prevent Memory Leaks:** Always detach event listeners (`EventEmitter.off()`, `removeEventListener()`), clear `setInterval`, and use `WeakMap`/`WeakSet` for non-retained object metadata.

## 4. String & Parsing Operations (Medium Impact)
* **Pre-compile Regular Expressions:** Define `RegExp` literals outside function boundaries or module-level constants to avoid runtime recompilation.
* **Fast Serialization:** For high-throughput API responses, prefer schema-based serializers like `fast-json-stringify` over native `JSON.stringify()`.

