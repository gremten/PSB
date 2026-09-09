import { EventEmitter } from "node:events";

declare global {
  var __psbEventBus: EventEmitter | undefined;
}

export const eventBus = globalThis.__psbEventBus ?? new EventEmitter();
eventBus.setMaxListeners(100);
globalThis.__psbEventBus = eventBus;
