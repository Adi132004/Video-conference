// services/webrtcService.js
import { ICE_SERVERS } from '../utils/constants';
import { logger } from '../utils/logger';

export function createPeerConnection(onIceCandidate, onTrack) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // queue for remote ICE candidates that arrive before remoteDescription
  pc._remoteCandidateQueue = [];

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      logger.debug('[webrtc] local ICE candidate:', event.candidate);
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    logger.info('[webrtc] remote track received, stream:', stream);
    onTrack(stream);
  };

  pc.onconnectionstatechange = () => {
    logger.info('[webrtc] connectionState:', pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    logger.info('[webrtc] iceConnectionState:', pc.iceConnectionState);
  };

  return pc;
}

export function addStreamToPeerConnection(pc, stream) {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
    logger.debug('[webrtc] added local track:', track.kind);
  });
}

export async function createOffer(pc) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  logger.info('[webrtc] offer created');
  return pc.localDescription || offer;
}

export async function createAnswer(pc) {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  logger.info('[webrtc] answer created');
  return pc.localDescription || answer;
}

export async function setRemoteDescription(pc, description) {
  if (!description) return;
  const desc = new RTCSessionDescription(description);
  logger.info('[webrtc] setting remote description:', desc.type, 'state=', pc.signalingState);

  try {
    await pc.setRemoteDescription(desc);
    logger.info('[webrtc] remote description set:', desc.type);
    await _flushQueuedCandidates(pc);
  } catch (err) {
    logger.error('[webrtc] Error setting remote description:', err);
    throw err;
  }
}

export async function addIceCandidate(pc, candidateObj) {
  if (!candidateObj) return;

  // if remote description not set yet, queue
  if (!pc.remoteDescription || !pc.remoteDescription.sdp) {
    pc._remoteCandidateQueue.push(candidateObj);
    logger.debug('[webrtc] queued remote ICE candidate, queue size =', pc._remoteCandidateQueue.length);
    return;
  }

  try {
    const candidate = new RTCIceCandidate(candidateObj);
    await pc.addIceCandidate(candidate);
    logger.debug('[webrtc] remote ICE candidate added immediately');
  } catch (err) {
    logger.error('[webrtc] Error adding ICE candidate:', err);
    throw err;
  }
}

async function _flushQueuedCandidates(pc) {
  const queue = pc._remoteCandidateQueue || [];
  if (!queue.length) return;

  logger.info('[webrtc] flushing', queue.length, 'queued ICE candidates');
  while (queue.length) {
    const c = queue.shift();
    try {
      const candidate = new RTCIceCandidate(c);
      await pc.addIceCandidate(candidate);
      logger.debug('[webrtc] flushed ICE candidate');
    } catch (err) {
      logger.error('[webrtc] Error flushing ICE candidate:', err);
    }
  }
}
