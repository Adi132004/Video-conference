import { useEffect, useState, useCallback } from 'react';
import { signalingService } from '../services/signalingService';
import { logger } from '../utils/logger';

/**
 * Custom hook for WebSocket connection
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleConnected = () => {
      logger.info('useWebSocket: Connected');
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      logger.info('useWebSocket: Disconnected');
      setIsConnected(false);
    };

    const handleError = (err) => {
      logger.error('useWebSocket: Error', err);
      setError(err);
    };

    const handleReconnectFailed = () => {
      setError(new Error('Failed to reconnect to server'));
    };

    // Register listeners
    signalingService.on('connected', handleConnected);
    signalingService.on('disconnected', handleDisconnected);
    signalingService.on('error', handleError);
    signalingService.on('reconnect-failed', handleReconnectFailed);

    // Cleanup on unmount
    return () => {
      signalingService.off('connected', handleConnected);
      signalingService.off('disconnected', handleDisconnected);
      signalingService.off('error', handleError);
      signalingService.off('reconnect-failed', handleReconnectFailed);
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      await signalingService.connect();
    } catch (err) {
      logger.error('Failed to connect:', err);
      setError(err);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    signalingService.disconnect();
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    signalingService.send(message);
  }, []);

  const on = useCallback((event, callback) => {
    signalingService.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    signalingService.off(event, callback);
  }, []);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    on,
    off
  };
}