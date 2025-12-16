package com.example.demo.models;


import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Universal message structure for WebSocket communication
 * All signaling messages use this format
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {

    /**
     * Type of message (JOIN, OFFER, ANSWER, etc.)
     */
    private MessageType type;

    /**
     * Sender's user ID
     */
    private String from;

    /**
     * Recipient's user ID (null for broadcast messages)
     */
    private String to;

    /**
     * Room ID
     */
    private String roomId;

    /**
     * Message payload (varies by type)
     * - For JOIN: {name: "John"}
     * - For OFFER/ANSWER: {sdp: "..."}
     * - For ICE_CANDIDATE: {candidate: "...", sdpMid: "...", sdpMLineIndex: 0}
     * - For MEDIA_STATE: {audio: true, video: false}
     */
    private JsonNode data;

    /**
     * Error message (only for ERROR type)
     */
    private String error;

    /**
     * Timestamp
     */
    private long timestamp;
}