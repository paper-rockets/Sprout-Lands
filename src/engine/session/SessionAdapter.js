/**
 * Abstract Session Boundary Adapter.
 * Defines the contract through which all gameplay actions, state queries,
 * and event subscriptions flow, allowing a transparent swap from local
 * single-player to authoritative multiplayer in future phases.
 */

export class SessionAdapter {
  constructor(gameConfig) {
    if (new.target === SessionAdapter) {
      throw new TypeError('Cannot construct SessionAdapter instances directly');
    }
    this.gameConfig = gameConfig;
    this.listeners = new Map();
  }

  // Subscribe to session state events
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      for (const cb of this.listeners.get(eventType)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Session callback error for event ${eventType}:`, err);
        }
      }
    }
  }

  // Action dispatch contract
  async dispatchAction(actionType, payload) {
    throw new Error('dispatchAction must be implemented by subclass');
  }

  // State inspection contract
  getState() {
    throw new Error('getState must be implemented by subclass');
  }
}
