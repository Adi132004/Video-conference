package com.example.demo.Service;


import com.example.demo.models.MessageType;
import com.example.demo.models.Participant;
import com.example.demo.models.Room;
import com.example.demo.models.SignalingMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service for broadcasting signaling messages to room participants
 */
@Service
public class SignalingService {

    private static final Logger log = LoggerFactory.getLogger(SignalingService.class);

    private final SessionService sessionService;
    private final RoomService roomService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SignalingService(SessionService sessionService, RoomService roomService) {
        this.sessionService = sessionService;
        this.roomService = roomService;
    }

    /**
     * Broadcast USER_JOINED to all existing participants in the room
     */
    public void broadcastUserJoined(String roomId, String newUserId, String newUserName) {
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            log.warn("Cannot broadcast USER_JOINED - room not found: {}", roomId);
            return;
        }

        // Create USER_JOINED message
        ObjectNode userData = objectMapper.createObjectNode();
        userData.put("userId", newUserId);
        userData.put("name", newUserName);

        SignalingMessage message = SignalingMessage.builder()
                .type(MessageType.USER_JOINED)
                .from(newUserId)
                .roomId(roomId)
                .data(userData)
                .timestamp(System.currentTimeMillis())
                .build();

        // Broadcast to all participants EXCEPT the new user
        int count = 0;
        for (Participant participant : room.getParticipants().values()) {
            if (!participant.getUserId().equals(newUserId)) {
                sessionService.sendToUser(participant.getUserId(), message);
                count++;
            }
        }

        log.info("Broadcasted USER_JOINED for {} to {} participants in room {}",
                newUserId, count, roomId);
    }

    /**
     * Send list of existing participants to a new joiner
     */
    public void sendParticipantList(String roomId, String newUserId) {
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            log.warn("Cannot send participant list - room not found: {}", roomId);
            return;
        }

        // Create array of existing participants (excluding the new user)
        ArrayNode participantsArray = objectMapper.createArrayNode();
        for (Participant participant : room.getParticipants().values()) {
            if (!participant.getUserId().equals(newUserId)) {
                ObjectNode participantData = objectMapper.createObjectNode();
                participantData.put("userId", participant.getUserId());
                participantData.put("name", participant.getName());
                participantData.put("audioEnabled", participant.isAudioEnabled());
                participantData.put("videoEnabled", participant.isVideoEnabled());
                participantsArray.add(participantData);
            }
        }

        // Create ROOM_INFO message with participant list
        ObjectNode roomData = objectMapper.createObjectNode();
        roomData.put("roomId", roomId);
        roomData.put("participantCount", room.getParticipantCount());
        roomData.set("participants", participantsArray);

        SignalingMessage message = SignalingMessage.builder()
                .type(MessageType.ROOM_INFO)
                .roomId(roomId)
                .to(newUserId)
                .data(roomData)
                .timestamp(System.currentTimeMillis())
                .build();

        sessionService.sendToUser(newUserId, message);
        log.info("Sent participant list to {} - {} existing participants",
                newUserId, participantsArray.size());
    }

    /**
     * Broadcast USER_LEFT to all remaining participants in the room
     */
    public void broadcastUserLeft(String roomId, String leftUserId) {
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            log.warn("Cannot broadcast USER_LEFT - room not found: {}", roomId);
            return;
        }

        // Create USER_LEFT message
        ObjectNode userData = objectMapper.createObjectNode();
        userData.put("userId", leftUserId);

        SignalingMessage message = SignalingMessage.builder()
                .type(MessageType.USER_LEFT)
                .from(leftUserId)
                .roomId(roomId)
                .data(userData)
                .timestamp(System.currentTimeMillis())
                .build();

        // Broadcast to all remaining participants
        int count = 0;
        for (Participant participant : room.getParticipants().values()) {
            sessionService.sendToUser(participant.getUserId(), message);
            count++;
        }

        log.info("Broadcasted USER_LEFT for {} to {} participants in room {}",
                leftUserId, count, roomId);
    }

    /**
     * Broadcast media state change to all participants in the room
     */
    public void broadcastMediaState(String roomId, String userId, boolean audioEnabled, boolean videoEnabled) {
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            log.warn("Cannot broadcast MEDIA_STATE - room not found: {}", roomId);
            return;
        }

        // Create MEDIA_STATE message
        ObjectNode mediaData = objectMapper.createObjectNode();
        mediaData.put("userId", userId);
        mediaData.put("audioEnabled", audioEnabled);
        mediaData.put("videoEnabled", videoEnabled);

        SignalingMessage message = SignalingMessage.builder()
                .type(MessageType.MEDIA_STATE)
                .from(userId)
                .roomId(roomId)
                .data(mediaData)
                .timestamp(System.currentTimeMillis())
                .build();

        // Broadcast to all participants EXCEPT the sender
        int count = 0;
        for (Participant participant : room.getParticipants().values()) {
            if (!participant.getUserId().equals(userId)) {
                sessionService.sendToUser(participant.getUserId(), message);
                count++;
            }
        }

        log.info("Broadcasted MEDIA_STATE for {} to {} participants in room {}",
                userId, count, roomId);
    }

    /**
     * Broadcast a message to all participants in a room
     */
    public void broadcastToRoom(String roomId, SignalingMessage message) {
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            log.warn("Cannot broadcast - room not found: {}", roomId);
            return;
        }

        for (Participant participant : room.getParticipants().values()) {
            sessionService.sendToUser(participant.getUserId(), message);
        }

        log.debug("Broadcasted {} to room {}", message.getType(), roomId);
    }
}