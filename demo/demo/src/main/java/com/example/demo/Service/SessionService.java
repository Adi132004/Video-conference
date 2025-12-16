package com.example.demo.Service;


import com.example.demo.models.SignalingMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to manage WebSocket sessions
 * Maps userId to WebSocketSession for message routing
 */

@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // userId -> WebSocketSession mapping
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    // WebSocketSession.id -> userId mapping (for cleanup)
    private final Map<String, String> sessionIdToUserId = new ConcurrentHashMap<>();

    /**
     * Register a new session
     */
    public void addSession(String userId, WebSocketSession session) {
        sessions.put(userId, session);
        sessionIdToUserId.put(session.getId(), userId);
        log.info("Added session for user: {} (sessionId: {})", userId, session.getId());
    }

    /**
     * Remove a session
     */
    public void removeSession(String sessionId) {
        String userId = sessionIdToUserId.remove(sessionId);
        if (userId != null) {
            sessions.remove(userId);
            log.info("Removed session for user: {} (sessionId: {})", userId, sessionId);
        }
    }

    /**
     * Get session by userId
     */
    public WebSocketSession getSession(String userId) {
        return sessions.get(userId);
    }

    /**
     * Get userId by session ID
     */
    public String getUserId(String sessionId) {
        return sessionIdToUserId.get(sessionId);
    }

    /**
     * Send message to a specific user
     */
    public void sendToUser(String userId, SignalingMessage message) {
        WebSocketSession session = sessions.get(userId);

        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                log.debug("Sent message to user {}: {}", userId, message.getType());
            } catch (IOException e) {
                log.error("Error sending message to user {}: {}", userId, e.getMessage());
            }
        } else {
            log.warn("Cannot send message - user {} not connected", userId);
        }
    }

    /**
     * Check if user is connected
     */
    public boolean isUserConnected(String userId) {
        WebSocketSession session = sessions.get(userId);
        return session != null && session.isOpen();
    }

    /**
     * Get all connected user IDs
     */
    public Map<String, WebSocketSession> getAllSessions() {
        return sessions;
    }

    /**
     * Get total number of connected users
     */
    public int getConnectedUserCount() {
        return sessions.size();
    }
}