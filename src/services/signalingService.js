
import { WS_URL, MessageType } from '../utils/constants';
import { logger } from '../utils/logger';

class SignalingService {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // event -> [cb]

    // NEW: track a single in-flight connection promise
    this.readyPromise = null;
  }

  /**
   * Connect to WebSocket server
   * - Idempotent
   * - Safe with React StrictMode (double effects)
   * - Returns a promise that resolves ONLY when ws is OPEN
   */
  connect() {
    // If already connected → resolve immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.info('[signal] WebSocket already connected');
      return Promise.resolve();
    }

    // If a connection attempt is already in progress → return same promise
    if (this.readyPromise) {
      logger.info('[signal] WebSocket is connecting (reusing pending promise)...');
      return this.readyPromise;
    }

    logger.info('[signal] Connecting to WebSocket:', WS_URL);

    this.readyPromise = new Promise((resolve, reject) => {
      let settled = false;

      try {
        this.ws = new WebSocket('/ws');
      } catch (err) {
        logger.error('[signal] Error creating WebSocket:', err);
        this.readyPromise = null;
        this.ws = null;
        return reject(err);
      }

      this.ws.onopen = () => {
        logger.info('[signal] WebSocket connected');
        this._notify('connected', null);

        if (!settled) {
          settled = true;
          resolve();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          logger.debug('[signal] message received:', msg);
          this._handleMessage(msg);
        } catch (e) {
          logger.error('[signal] Error parsing message:', e);
        }
      };

      this.ws.onerror = (event) => {
        logger.error('[signal] WebSocket error event', event);
        this._notify('error', event);

        // If error happens before open/close, fail connect()
        if (!settled) {
          settled = true;
          this.readyPromise = null;
          this.ws = null;
          reject(new Error('WebSocket error during connect'));
        }
      };

      this.ws.onclose = (event) => {
        logger.info('[signal] WebSocket closed:', event.code, event.reason);
        this._notify('disconnected', event);

        // If connection was never successfully opened, treat as failed connect
        if (!settled) {
          settled = true;
          this.readyPromise = null;
          const err =
            event.code === 1000
              ? new Error('WebSocket closed before open')
              : new Error('WebSocket closed during connect');
          reject(err);
        }

        this.ws = null;
        this.readyPromise = null;
      };
    });

    return this.readyPromise;
  }

  /**
   * Simple send wrapper
   * (Call AFTER `await signalingService.connect()`)
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[signal] Cannot send message - WebSocket not open');
      return;
    }
    const payload = {
      ...message,
      timestamp: Date.now(),
    };
    logger.debug('[signal] sending:', payload);
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Incoming messages → event bus
   */
  _handleMessage(message) {
    const { type } = message;
    if (type) {
      this._notify(type, message);
    }
    this._notify('message', message);
  }

  /**
   * Event subscription
   */
  on(event, cb) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(cb);
  }

  off(event, cb) {
    if (!this.listeners.has(event)) return;
    const arr = this.listeners.get(event);
    const idx = arr.indexOf(cb);
    if (idx > -1) arr.splice(idx, 1);
  }

  _notify(event, data) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    arr.forEach(fn => {
      try {
        fn(data);
      } catch (e) {
        logger.error('[signal] listener error for', event, e);
      }
    });
  }

  /**
   * Manual disconnect
   * - Safe with pending connect()
   * - onclose handler will clean up readyPromise/ws
   */
  disconnect() {
    if (this.ws) {
      logger.info('[signal] Closing WebSocket (manual)');
      try {
        this.ws.close();
      } catch (e) {
        logger.error('[signal] Error closing WebSocket:', e);
      }
      // Do NOT null readyPromise here;
      // onclose will handle cleanup and reject pending connect() if needed.
    } else {
      // no ws, also clear any stale promise
      this.readyPromise = null;
    }
  }

  isConnected() {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  // Convenience wrappers
  sendJoin(roomId, userId, name) {
    this.send({
      type: MessageType.JOIN,
      from: userId,
      roomId,
      data: { name },
    });
  }

  sendLeave(roomId, userId) {
    this.send({
      type: MessageType.LEAVE,
      from: userId,
      roomId,
    });
  }

  sendOffer(roomId, from, to, offer) {
    this.send({
      type: MessageType.OFFER,
      from,
      to,
      roomId,
      data: { sdp: offer.sdp, type: offer.type },
    });
  }

  sendAnswer(roomId, from, to, answer) {
    this.send({
      type: MessageType.ANSWER,
      from,
      to,
      roomId,
      data: { sdp: answer.sdp, type: answer.type },
    });
  }

  sendIceCandidate(roomId, from, to, candidate) {
    this.send({
      type: MessageType.ICE_CANDIDATE,
      from,
      to,
      roomId,
      data: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      },
    });
  }

  sendMediaState(roomId, userId, audioEnabled, videoEnabled) {
    this.send({
      type: MessageType.MEDIA_STATE,
      from: userId,
      roomId,
      data: { audioEnabled, videoEnabled },
    });
  }
}

export const signalingService = new SignalingService();
