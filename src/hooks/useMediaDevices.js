import { useState, useEffect, useCallback } from 'react';
import { MEDIA_CONSTRAINTS } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Custom hook for managing media devices (camera/microphone)
 */
export function useMediaDevices() {
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get user media (camera + microphone)
   */
  const getLocalStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Requesting media devices...');
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      
      logger.info('Media devices granted:', {
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length
      });

      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      return stream;
    } catch (err) {
      logger.error('Error accessing media devices:', err);
      setError(err.message || 'Failed to access camera/microphone');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
//   if (!navigator.mediaDevices?.getUserMedia) {
//   throw new Error(
//     'Camera access requires HTTPS or localhost'
//   );
// }


  /**
   * Stop all media tracks
   */
  const stopLocalStream = useCallback(() => {
    if (localStream) {
      logger.info('Stopping local stream');
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  /**
   * Toggle audio (mute/unmute)
   */
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        logger.info('Audio toggled:', audioTrack.enabled);
        return audioTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  /**
   * Toggle video (camera on/off)
   */
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        logger.info('Video toggled:', videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopLocalStream();
    };
  }, [stopLocalStream]);

  return {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isLoading,
    error,
    getLocalStream,
    stopLocalStream,
    toggleAudio,
    toggleVideo
  };
}