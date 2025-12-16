package com.example.demo.models;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Represents a video conference room
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    /**
     * Unique room identifier
     */
    private String roomId;

    /**
     * Participants in this room (userId -> Participant)
     */
    @Builder.Default
    private Map<String, Participant> participants = new ConcurrentHashMap<>();

    /**
     * Maximum number of participants allowed
     */
    @Builder.Default
    private int maxParticipants = 10;

    /**
     * When the room was created
     */
    private LocalDateTime createdAt;

    /**
     * Last activity timestamp (for cleanup)
     */
    private LocalDateTime lastActivity;

    /**
     * Optional room password/PIN
     */
    private String password;

    /**
     * Check if room is full
     */
    public boolean isFull() {
        return participants.size() >= maxParticipants;
    }

    /**
     * Check if room is empty
     */
    public boolean isEmpty() {
        return participants.isEmpty();
    }

    /**
     * Get participant count
     */
    public int getParticipantCount() {
        return participants.size();
    }

    /**
     * Add a participant to the room
     */
    public void addParticipant(Participant participant) {
        participants.put(participant.getUserId(), participant);
        updateLastActivity();
    }

    /**
     * Remove a participant from the room
     */
    public Participant removeParticipant(String userId) {
        Participant removed = participants.remove(userId);
        updateLastActivity();
        return removed;
    }

    /**
     * Get a participant by userId
     */
    public Participant getParticipant(String userId) {
        return participants.get(userId);
    }

    /**
     * Update last activity timestamp
     */
    public void updateLastActivity() {
        this.lastActivity = LocalDateTime.now();
    }
}