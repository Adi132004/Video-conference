import { API_URL } from '../utils/constants';
import { logger } from '../utils/logger';


export async function createRoom() {
  const url = `/api/rooms/create`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!response.ok) {
      const serverMsg =
        (data && (data.error || data.message)) ||
        text ||
        `HTTP ${response.status}`;
      throw new Error(`Create room failed: ${serverMsg}`);
    }

    return data;
  } catch (error) {
    logger.error('Error creating room:', error);
    throw error;
  }
}

/**
 * Get room information
 */
export async function getRoomInfo(roomId) {
  try {
    const response = await fetch(`/api/rooms/${roomId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Room not found');
      }
      throw new Error(`Failed to get room info (HTTP ${response.status})`);
    }

    const data = await response.json();
    logger.info('Room info:', data);
    return data;
  } catch (error) {
    logger.error('Error getting room info:', error);
    throw error;
  }
}

/**
 * Get participants in a room
 */
export async function getRoomParticipants(roomId) {
  try {
    const response = await fetch(`/api/rooms/${roomId}/participants`);

    if (!response.ok) {
      throw new Error(`Failed to get participants (HTTP ${response.status})`);
    }

    const data = await response.json();
    logger.info('Room participants:', data);
    return data;
  } catch (error) {
    logger.error('Error getting participants:', error);
    throw error;
  }
}
