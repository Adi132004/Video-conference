// hooks/useWebRTC.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { signalingService } from '../services/signalingService';
import { MessageType } from '../utils/constants';
import { logger } from '../utils/logger';
import {
  createPeerConnection,
  addIceCandidate,
  createOffer,
  createAnswer,
  setRemoteDescription,
} from '../services/webrtcService';

export function useWebRTC(roomId, userId, localStream) {
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const peerConnectionsRef = useRef(new Map());
  const isInitiatorRef = useRef(false);

  /**
   * Create or reuse PeerConnection
   * IMPORTANT: local tracks are added ONLY if localStream exists
   */
  const createPeerConnectionForUser = useCallback(
    (remoteUserId) => {
      if (peerConnectionsRef.current.has(remoteUserId)) {
        return peerConnectionsRef.current.get(remoteUserId);
      }

      logger.info('[useWebRTC] Creating peer connection for:', remoteUserId);

      const pc = createPeerConnection(
        // ICE
        (candidate) => {
          signalingService.sendIceCandidate(
            roomId,
            userId,
            remoteUserId,
            candidate
          );
        },
        // Remote track
        (stream) => {
          logger.info('[useWebRTC] Received remote stream from:', remoteUserId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(remoteUserId, stream);
            return next;
          });
        }
      );

      // 🔑 CRITICAL: add local tracks ONLY if localStream exists
      if (localStream && pc.getSenders().length === 0) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      peerConnectionsRef.current.set(remoteUserId, pc);
      return pc;
    },
    [roomId, userId, localStream]
  );

  /**
   * ROOM_INFO
   * Decide role only
   */
  const handleRoomInfo = useCallback((message) => {
    const participants = message.data?.participants || [];
    logger.info('[useWebRTC] RoomInfo, participants:', participants);

    if (participants.length === 0) {
      isInitiatorRef.current = true;
      logger.info('[useWebRTC] Acting as INITIATOR');
    } else {
      isInitiatorRef.current = false;
      logger.info('[useWebRTC] Acting as JOINER');
    }
  }, []);

  /**
   * USER_JOINED
   * INITIATOR creates offer — ONLY if localStream exists
   */
  const handleUserJoined = useCallback(
    async (message) => {
      const remoteUserId = message.data?.userId;
      if (!remoteUserId || remoteUserId === userId) return;

      if (!isInitiatorRef.current) {
        logger.info('[useWebRTC] Not initiator, skipping offer');
        return;
      }

      if (!localStream) {
        logger.warn('[useWebRTC] Local stream not ready — skipping offer');
        return;
      }

      logger.info('[useWebRTC] Creating offer for:', remoteUserId);

      try {
        const pc = createPeerConnectionForUser(remoteUserId);

        if (pc.signalingState !== 'stable') {
          logger.warn(
            '[useWebRTC] Skipping offer, signalingState:',
            pc.signalingState
          );
          return;
        }

        const offer = await createOffer(pc);
        signalingService.sendOffer(roomId, userId, remoteUserId, offer);
      } catch (err) {
        logger.error('[useWebRTC] Error creating offer:', err);
      }
    },
    [userId, roomId, localStream, createPeerConnectionForUser]
  );

  /**
   * OFFER
   * Joiner receives offer and answers
   */
  const handleOffer = useCallback(
    async (message) => {
      const remoteUserId = message.from;
      logger.info('[useWebRTC] Received offer from:', remoteUserId);

      try {
        const pc = createPeerConnectionForUser(remoteUserId);

        if (pc.signalingState !== 'stable') {
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch {}
        }

        await setRemoteDescription(pc, message.data);

        const answer = await createAnswer(pc);
        signalingService.sendAnswer(roomId, userId, remoteUserId, answer);
      } catch (err) {
        logger.error('[useWebRTC] Error handling offer:', err);
      }
    },
    [userId, roomId, createPeerConnectionForUser]
  );

  /**
   * ANSWER
   */
  const handleAnswer = useCallback(async (message) => {
    const remoteUserId = message.from;
    logger.info('[useWebRTC] Received answer from:', remoteUserId);

    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (!pc) return;

    if (pc.signalingState !== 'have-local-offer') {
      logger.warn(
        '[useWebRTC] Ignoring answer in state:',
        pc.signalingState
      );
      return;
    }

    try {
      await setRemoteDescription(pc, message.data);
    } catch (err) {
      logger.error('[useWebRTC] Error setting answer:', err);
    }
  }, []);

  /**
   * ICE
   */
  const handleIceCandidate = useCallback(
    async (message) => {
      const remoteUserId = message.from;
      try {
        const pc = createPeerConnectionForUser(remoteUserId);
        await addIceCandidate(pc, message.data);
      } catch (err) {
        logger.error('[useWebRTC] ICE error:', err);
      }
    },
    [createPeerConnectionForUser]
  );

  /**
   * USER_LEFT
   */
  const handleUserLeft = useCallback((message) => {
    const remoteUserId = message.data.userId;
    logger.info('[useWebRTC] User left:', remoteUserId);

    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (pc) pc.close();

    peerConnectionsRef.current.delete(remoteUserId);

    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(remoteUserId);
      return next;
    });
  }, []);

  /**
   * Register signaling handlers
   */
  useEffect(() => {
    signalingService.on(MessageType.ROOM_INFO, handleRoomInfo);
    signalingService.on(MessageType.USER_JOINED, handleUserJoined);
    signalingService.on(MessageType.OFFER, handleOffer);
    signalingService.on(MessageType.ANSWER, handleAnswer);
    signalingService.on(MessageType.ICE_CANDIDATE, handleIceCandidate);
    signalingService.on(MessageType.USER_LEFT, handleUserLeft);

    return () => {
      signalingService.off(MessageType.ROOM_INFO, handleRoomInfo);
      signalingService.off(MessageType.USER_JOINED, handleUserJoined);
      signalingService.off(MessageType.OFFER, handleOffer);
      signalingService.off(MessageType.ANSWER, handleAnswer);
      signalingService.off(MessageType.ICE_CANDIDATE, handleIceCandidate);
      signalingService.off(MessageType.USER_LEFT, handleUserLeft);
    };
  }, [
    handleRoomInfo,
    handleUserJoined,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleUserLeft,
  ]);

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    logger.info('[useWebRTC] Cleaning up all peer connections');

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });

    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
  }, []);

  return {
    remoteStreams,
    cleanup,
  };
}
