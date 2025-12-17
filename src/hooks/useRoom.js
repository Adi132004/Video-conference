// import { useState, useEffect, useCallback } from 'react';
// import { useWebSocket } from './useWebSocket';
// import { MessageType } from '../utils/constants';
// import { logger } from '../utils/logger';
// import { signalingService } from '../services/signalingService';

// /**
//  * Custom hook for room management
//  */
// export function useRoom(roomId, userId, userName) {
//   const { isConnected, connect, disconnect, on, off } = useWebSocket();
//   const [participants, setParticipants] = useState([]);
//   const [isJoined, setIsJoined] = useState(false);
//   const [error, setError] = useState(null);

//   // Join room when connected
//   useEffect(() => {
//     if (isConnected && !isJoined) {
//       logger.info('Joining room:', roomId);
//       signalingService.sendJoin(roomId, userId, userName);
//     }
//   }, [isConnected, isJoined, roomId, userId, userName]);

//   // Handle incoming messages
//   useEffect(() => {
//     const handleRoomJoined = (message) => {
//       logger.info('Room joined:', message);
//       setIsJoined(true);
//       setError(null);
//     };

//     const handleRoomInfo = (message) => {
//       logger.info('Room info received:', message);
//       if (message.data && message.data.participants) {
//         setParticipants(message.data.participants);
//       }
//     };

//     const handleUserJoined = (message) => {
//       logger.info('User joined:', message);
//       if (message.data) {
//         setParticipants(prev => {
//           // Check if user already exists
//           const exists = prev.find(p => p.userId === message.data.userId);
//           if (exists) return prev;
          
//           return [...prev, {
//             userId: message.data.userId,
//             name: message.data.name,
//             audioEnabled: true,
//             videoEnabled: true
//           }];
//         });
//       }
//     };

//     const handleUserLeft = (message) => {
//       logger.info('User left:', message);
//       if (message.data) {
//         setParticipants(prev => 
//           prev.filter(p => p.userId !== message.data.userId)
//         );
//       }
//     };

//     const handleMediaState = (message) => {
//       logger.info('Media state changed:', message);
//       if (message.data) {
//         setParticipants(prev => 
//           prev.map(p => 
//             p.userId === message.data.userId
//               ? { 
//                   ...p, 
//                   audioEnabled: message.data.audioEnabled,
//                   videoEnabled: message.data.videoEnabled
//                 }
//               : p
//           )
//         );
//       }
//     };

//     const handleError = (message) => {
//       logger.error('Room error:', message);
//       setError(message.error || 'An error occurred');
//     };

//     // Register listeners
//     on(MessageType.ROOM_JOINED, handleRoomJoined);
//     on(MessageType.ROOM_INFO, handleRoomInfo);
//     on(MessageType.USER_JOINED, handleUserJoined);
//     on(MessageType.USER_LEFT, handleUserLeft);
//     on(MessageType.MEDIA_STATE, handleMediaState);
//     on(MessageType.ERROR, handleError);

//     // Cleanup
//     return () => {
//       off(MessageType.ROOM_JOINED, handleRoomJoined);
//       off(MessageType.ROOM_INFO, handleRoomInfo);
//       off(MessageType.USER_JOINED, handleUserJoined);
//       off(MessageType.USER_LEFT, handleUserLeft);
//       off(MessageType.MEDIA_STATE, handleMediaState);
//       off(MessageType.ERROR, handleError);
//     };
//   }, [on, off]);

//   // Connect on mount
//   useEffect(() => {
//     connect().catch(err => {
//       logger.error('Failed to connect to room:', err);
//       setError('Failed to connect to server');
//     });

//     return () => {
//       if (isJoined) {
//         signalingService.sendLeave(roomId, userId);
//       }
//       disconnect();
//     };
//   }, [roomId, userId]);

//   const leaveRoom = useCallback(() => {
//     if (isJoined) {
//       signalingService.sendLeave(roomId, userId);
//       setIsJoined(false);
//     }
//     disconnect();
//   }, [isJoined, roomId, userId, disconnect]);

//   return {
//     isConnected,
//     isJoined,
//     participants,
//     error,
//     leaveRoom
//   };
// }
// hooks/useRoom.js
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { MessageType } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Custom hook for room management
 * - NO WebSocket connect/disconnect here
 * - NO JOIN/LEAVE sending here
 * - Only manages room state based on signaling events
 */
export function useRoom(roomId, userId, userName) {
  const { isConnected, on, off } = useWebSocket(); // ⬅️ removed connect / disconnect
  const [participants, setParticipants] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  // 🚫 Removed: "Join room when connected" effect
  // That logic now lives ONLY in Room.jsx

  // Handle incoming messages
  useEffect(() => {
    const handleRoomJoined = (message) => {
      logger.info('Room joined:', message);
      setIsJoined(true);
      setError(null);
    };

    const handleRoomInfo = (message) => {
      logger.info('Room info received:', message);
      if (message.data && message.data.participants) {
        setParticipants(message.data.participants);
      }
    };

    const handleUserJoined = (message) => {
      logger.info('User joined:', message);
      if (message.data) {
        setParticipants(prev => {
          // Check if user already exists
          const exists = prev.find(p => p.userId === message.data.userId);
          if (exists) return prev;
          
          return [
            ...prev,
            {
              userId: message.data.userId,
              name: message.data.name,
              audioEnabled: true,
              videoEnabled: true,
            },
          ];
        });
      }
    };

    const handleUserLeft = (message) => {
      logger.info('User left:', message);
      if (message.data) {
        setParticipants(prev =>
          prev.filter(p => p.userId !== message.data.userId)
        );
      }
    };

    const handleMediaState = (message) => {
      logger.info('Media state changed:', message);
      if (message.data) {
        setParticipants(prev =>
          prev.map(p =>
            p.userId === message.data.userId
              ? {
                  ...p,
                  audioEnabled: message.data.audioEnabled,
                  videoEnabled: message.data.videoEnabled,
                }
              : p
          )
        );
      }
    };

    const handleError = (message) => {
      logger.error('Room error:', message);
      setError(message.error || 'An error occurred');
    };

    // Register listeners
    on(MessageType.ROOM_JOINED, handleRoomJoined);
    on(MessageType.ROOM_INFO, handleRoomInfo);
    on(MessageType.USER_JOINED, handleUserJoined);
    on(MessageType.USER_LEFT, handleUserLeft);
    on(MessageType.MEDIA_STATE, handleMediaState);
    on(MessageType.ERROR, handleError);

    // Cleanup
    return () => {
      off(MessageType.ROOM_JOINED, handleRoomJoined);
      off(MessageType.ROOM_INFO, handleRoomInfo);
      off(MessageType.USER_JOINED, handleUserJoined);
      off(MessageType.USER_LEFT, handleUserLeft);
      off(MessageType.MEDIA_STATE, handleMediaState);
      off(MessageType.ERROR, handleError);
    };
  }, [on, off]);

  // 🚫 Removed: "Connect on mount" effect
  // That was calling connect() + disconnect() + sendLeave()
  // Room.jsx owns those now.

  const leaveRoom = useCallback(() => {
    // This is now just a local state reset helper.
    // Actual LEAVE message + disconnect is handled in Room.jsx.
    if (isJoined) {
      setIsJoined(false);
    }
    setParticipants([]);
    setError(null);
  }, [isJoined]);

  return {
    isConnected,
    isJoined,
    participants,
    error,
    leaveRoom,
  };
}
