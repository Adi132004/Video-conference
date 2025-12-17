package com.example.demo.Handler;


import com.example.demo.models.MessageType;
import com.example.demo.models.Participant;
import com.example.demo.models.Room;
import com.example.demo.models.SignalingMessage;
import com.example.demo.Service.RoomService;
import com.example.demo.Service.SessionService;
import com.example.demo.Service.SignalingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalingHandler.class);

    private final RoomService roomService;
    private final SessionService sessionService;
    private final SignalingService signalingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Track sessionId -> roomId for cleanup
    private final Map<String, String> sessionToRoom = new ConcurrentHashMap<>();

    public SignalingHandler(RoomService roomService, SessionService sessionService,
                            SignalingService signalingService) {
        this.roomService = roomService;
        this.sessionService = sessionService;
        this.signalingService = signalingService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("Received message: {}", payload);

        SignalingMessage msg = objectMapper.readValue(payload, SignalingMessage.class);

        // Route message based on type
        switch (msg.getType()) {
            case JOIN:
                handleJoin(session, msg);
                break;
            case OFFER:
                handleOffer(msg);
                break;
            case ANSWER:
                handleAnswer(msg);
                break;
            case ICE_CANDIDATE:
                handleIceCandidate(msg);
                break;
            case MEDIA_STATE:
                handleMediaState(msg);
                break;
            case LEAVE:
                handleLeave(msg);
                break;
            default:
                log.warn("Unknown message type: {}", msg.getType());
        }
    }

    /**
     * Handle JOIN message
     */
    private void handleJoin(WebSocketSession session, SignalingMessage msg) throws Exception {
        String roomId = msg.getRoomId();
        String userId = msg.getFrom();

        // Get or create room
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            room = roomService.createRoom(roomId);
            log.info("Created new room: {}", roomId);
        }

        // Get user name from message data (if provided)
        String userName = "User_" + userId.substring(0, Math.min(4, userId.length()));
        if (msg.getData() != null && msg.getData().has("name")) {
            userName = msg.getData().get("name").asText();
        }

        // Register session
        sessionService.addSession(userId, session);
        sessionToRoom.put(session.getId(), roomId);

        // Create participant
        Participant participant = Participant.builder()
                .userId(userId)
                .name(userName)
                .session(session)
                .roomId(roomId)
                .joinedAt(LocalDateTime.now())
                .audioEnabled(true)
                .videoEnabled(true)
                .build();

        // Add to room
        roomService.addParticipant(roomId, participant);

        // Send ROOM_JOINED confirmation to the new user
        SignalingMessage response = SignalingMessage.builder()
                .type(MessageType.ROOM_JOINED)
                .roomId(roomId)
                .from(userId)
                .timestamp(System.currentTimeMillis())
                .build();

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));

        // Send list of existing participants to the new user
        signalingService.sendParticipantList(roomId, userId);

        // Broadcast USER_JOINED to all existing participants
        signalingService.broadcastUserJoined(roomId, userId, userName);

        log.info("User {} ({}) joined room {} - {} total participants",
                userId, userName, roomId, room.getParticipantCount());
    }

    /**
     * Handle OFFER message
     */
    private void handleOffer(SignalingMessage msg) {
        String from = msg.getFrom();
        String to = msg.getTo();

        log.info("Relaying OFFER from {} to {}", from, to);
        sessionService.sendToUser(to, msg);
    }

    /**
     * Handle ANSWER message
     */
    private void handleAnswer(SignalingMessage msg) {
        String from = msg.getFrom();
        String to = msg.getTo();

        log.info("Relaying ANSWER from {} to {}", from, to);
        sessionService.sendToUser(to, msg);
    }

    /**
     * Handle ICE_CANDIDATE message
     */
    private void handleIceCandidate(SignalingMessage msg) {
        String from = msg.getFrom();
        String to = msg.getTo();

        log.debug("Relaying ICE_CANDIDATE from {} to {}", from, to);
        sessionService.sendToUser(to, msg);
    }

    /**
     * Handle MEDIA_STATE message (mute/unmute, camera on/off)
     */
    private void handleMediaState(SignalingMessage msg) {
        String userId = msg.getFrom();
        String roomId = msg.getRoomId();

        JsonNode data = msg.getData();
        boolean audioEnabled = data.has("audioEnabled") ? data.get("audioEnabled").asBoolean() : true;
        boolean videoEnabled = data.has("videoEnabled") ? data.get("videoEnabled").asBoolean() : true;

        log.info("User {} media state: audio={}, video={}", userId, audioEnabled, videoEnabled);

        // Update participant state
        Room room = roomService.getRoom(roomId);
        if (room != null) {
            Participant participant = room.getParticipant(userId);
            if (participant != null) {
                participant.setAudioEnabled(audioEnabled);
                participant.setVideoEnabled(videoEnabled);
            }
        }

        // Broadcast to other participants
        signalingService.broadcastMediaState(roomId, userId, audioEnabled, videoEnabled);
    }

    /**
     * Handle LEAVE message
     */
    private void handleLeave(SignalingMessage msg) {
        String userId = msg.getFrom();
        String roomId = msg.getRoomId();

        log.info("User {} leaving room {}", userId, roomId);

        // Broadcast USER_LEFT before removing
        signalingService.broadcastUserLeft(roomId, userId);

        // Remove from room
        roomService.removeParticipant(roomId, userId);

        // Remove session
        WebSocketSession session = sessionService.getSession(userId);
        if (session != null) {
            sessionToRoom.remove(session.getId());
            sessionService.removeSession(session.getId());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = sessionService.getUserId(session.getId());
        String roomId = sessionToRoom.get(session.getId());

        if (userId != null && roomId != null) {
            log.info("WebSocket disconnected: {} (user: {}, room: {})",
                    session.getId(), userId, roomId);

            // Broadcast USER_LEFT
            signalingService.broadcastUserLeft(roomId, userId);

            // Remove from room
            roomService.removeParticipant(roomId, userId);

            // Cleanup
            sessionToRoom.remove(session.getId());
            sessionService.removeSession(session.getId());
        } else {
            log.info("WebSocket disconnected: {}", session.getId());
        }
    }
}