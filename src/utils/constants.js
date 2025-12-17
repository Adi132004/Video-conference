// WebSocket and API URLs
export const protocol =
  window.location.protocol === 'https:' ? 'wss' : 'ws';

export const WS_URL = `${protocol}://${window.location.hostname}:${import.meta.env.VITE_WS_PORT}/ws`;

export const API_URL =
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT}${import.meta.env.VITE_API_BASE}`;


// STUN/TURN servers for WebRTC
export const ICE_SERVERS = [
  {
    urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302'
  }
];

// Message types (must match backend)
export const MessageType = {
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  ROOM_JOINED: 'ROOM_JOINED',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  MEDIA_STATE: 'MEDIA_STATE',
  ROOM_INFO: 'ROOM_INFO',
  ERROR: 'ERROR'
};

// Room constraints
export const MAX_PARTICIPANTS = 10;

// Media constraints
export const MEDIA_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
};