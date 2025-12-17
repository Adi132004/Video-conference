
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LocalVideo from '../components/video/LocalVideo';
import RemoteVideo from '../components/video/RemoteVideo';
import VideoControls from '../components/video/VideoControls';
import { useRoom } from '../hooks/useRoom';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useWebRTC } from '../hooks/useWebRTC';
import { signalingService } from '../services/signalingService';
import { logger } from '../utils/logger';
import { MessageType } from '../utils/constants';
import './Room.css';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [userId] = useState(() => uuidv4());
  const [userName] = useState(() => `User_${Math.random().toString(36).substring(2, 6)}`);

  // track if we've already sent JOIN for this mount (StrictMode-safe)
  const hasJoinedRef = useRef(false);
  
  const { 
    isConnected, 
    isJoined, 
    participants, 
    error: roomError, 
    leaveRoom 
  } = useRoom(roomId, userId, userName);

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isLoading: mediaLoading,
    error: mediaError,
    getLocalStream,
    stopLocalStream,
    toggleAudio,
    toggleVideo
  } = useMediaDevices();

  const { remoteStreams, cleanup } = useWebRTC(roomId, userId, localStream);

  /**
   * Connect WebSocket and JOIN room
   * - wait a tick after connect so other hooks can register listeners
   * - wait once for ROOM_JOINED (with timeout) so UI doesn't get stuck
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        logger.info('[Room.jsx] connecting to signaling...');
        await signalingService.connect();
        if (cancelled) return;

        // Small delay so useRoom / useWebRTC effects have a chance to register listeners.
        // This avoids missing early ROOM_JOINED / ROOM_INFO messages.
        await new Promise(r => setTimeout(r, 50));

        if (!hasJoinedRef.current) {
          logger.info('[Room.jsx] Sending JOIN for room:', roomId, 'user:', userId);
          signalingService.sendJoin(roomId, userId, userName);
          hasJoinedRef.current = true;

          // Wait once for ROOM_JOINED event (robustness). Timeout = 3000ms.
          try {
            await new Promise((resolve, reject) => {
              let settled = false;

              const onJoined = (msg) => {
                if (settled) return;
                settled = true;
                signalingService.off(MessageType.ROOM_JOINED, onJoined);
                logger.info('[Room.jsx] Received ROOM_JOINED:', msg);
                resolve(msg);
              };

              signalingService.on(MessageType.ROOM_JOINED, onJoined);

              setTimeout(() => {
                if (settled) return;
                settled = true;
                signalingService.off(MessageType.ROOM_JOINED, onJoined);
                reject(new Error('Timed out waiting for ROOM_JOINED'));
              }, 3000);
            });
          } catch (err) {
            logger.warn('[Room.jsx] ROOM_JOINED wait timed out or failed:', err);
            // proceed — useRoom will still update when ROOM_INFO arrives.
          }
        }
      } catch (err) {
        logger.error('[Room.jsx] connect/join flow error:', err);
      }
    })();

    return () => {
      cancelled = true;
      logger.info('[Room.jsx] Effect cleanup: peer cleanup only (no sendLeave/disconnect)');
      
      // Only local cleanup here. DO NOT send LEAVE or disconnect here — StrictMode runs this cleanup
      // during development on a fake unmount which previously killed the socket mid-handshake.
      try {
        cleanup();
      } catch (e) {
        logger.error('[Room.jsx] Error during peer cleanup in effect cleanup:', e);
      }
      hasJoinedRef.current = false;
    };
  }, [roomId, userId, userName, cleanup]);

  /**
   * Get media devices once signaling is connected
   */
  useEffect(() => {
    if (isConnected && !localStream) {
      logger.info('[Room.jsx] Requesting media devices...');
      getLocalStream().catch(err => {
        logger.error('[Room.jsx] Failed to get media devices:', err);
      });
    }
  }, [isConnected, localStream, getLocalStream]);

  // Handle audio toggle with signaling
  const handleToggleAudio = () => {
    const newState = toggleAudio();
    signalingService.sendMediaState(roomId, userId, newState, isVideoEnabled);
  };

  // Handle video toggle with signaling
  const handleToggleVideo = () => {
    const newState = toggleVideo();
    signalingService.sendMediaState(roomId, userId, isAudioEnabled, newState);
  };

  // Handle leave room (user explicitly leaves)
  const handleLeaveRoom = () => {
    logger.info('[Room.jsx] handleLeaveRoom: stopping media, leaving room, disconnecting socket');

    // Stop local media
    try {
      stopLocalStream();
    } catch (e) {
      logger.error('[Room.jsx] Error stopping local stream:', e);
    }

    // Local room state cleanup (hook-level)
    try {
      leaveRoom();
    } catch (e) {
      logger.error('[Room.jsx] Error calling leaveRoom hook:', e);
    }

    // Inform server (best-effort)
    try {
      signalingService.sendLeave(roomId, userId);
    } catch (e) {
      logger.warn('[Room.jsx] sendLeave failed (best-effort):', e);
    }

    // Close all peer connections
    try {
      cleanup();
    } catch (e) {
      logger.error('[Room.jsx] Error during cleanup:', e);
    }

    // Now close the socket (user explicitly left)
    try {
      signalingService.disconnect();
    } catch (e) {
      logger.error('[Room.jsx] Error disconnecting signalingService:', e);
    }

    // Navigate away
    navigate('/');
  };

  // Show loading while connecting
  if (!isConnected || mediaLoading) {
    return (
      <div className="room room-loading">
        <LoadingSpinner 
          size="large" 
          text={mediaLoading ? 'Accessing camera and microphone...' : 'Connecting to room...'} 
        />
      </div>
    );
  }

  // Show error if connection or media failed
  if (roomError || mediaError) {
    return (
      <div className="room room-error">
        <div className="error-container">
          <h2>Error</h2>
          <p>{roomError || mediaError}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading while joining
  if (!isJoined) {
    return (
      <div className="room room-loading">
        <LoadingSpinner size="large" text="Joining room..." />
      </div>
    );
  }

  return (
    <div className="room">
      {/* Header */}
      <div className="room-header">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <div className="participant-count">
            <Users size={20} />
            <span>{participants.length + 1} participant{participants.length !== 0 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="room-content">
        <div className="video-grid">
          {/* Local Video */}
          <div className="video-item">
            <LocalVideo
              stream={localStream}
              userName={userName}
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
            />
          </div>

          {/* Remote Videos */}
          {participants.map(participant => {
            const stream = remoteStreams.get(participant.userId);
            return (
              <div key={participant.userId} className="video-item">
                {stream ? (
                  <RemoteVideo
                    stream={stream}
                    participant={participant}
                  />
                ) : (
                  <div className="video-container connecting">
                    <div className="video-off-placeholder">
                      <LoadingSpinner size="medium" text="Connecting..." />
                    </div>
                    <div className="video-overlay">
                      <span className="video-name">{participant.name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Participants Sidebar */}
        <div className="participants-sidebar">
          <h3>Participants ({participants.length + 1})</h3>
          <ul className="participants-list">
            <li className="participant-item you">
              <div className="participant-info">
                <span className="participant-name">{userName}</span>
                <span className="participant-label">(You)</span>
              </div>
              <div className="participant-status">
                {!isAudioEnabled && <span className="status-icon">🔇</span>}
                {!isVideoEnabled && <span className="status-icon">📷</span>}
                <span className="status-indicator online"></span>
              </div>
            </li>
            {participants.map(participant => (
              <li key={participant.userId} className="participant-item">
                <div className="participant-info">
                  <span className="participant-name">{participant.name}</span>
                </div>
                <div className="participant-status">
                  {!participant.audioEnabled && <span className="status-icon">🔇</span>}
                  {!participant.videoEnabled && <span className="status-icon">📷</span>}
                  <span className="status-indicator online"></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Controls */}
      <VideoControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onLeave={handleLeaveRoom}
      />
    </div>
  );
}

export default Room;
