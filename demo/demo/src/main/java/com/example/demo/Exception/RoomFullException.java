package com.example.demo.Exception;


/**
 * Exception thrown when trying to join a full room
 */
public class RoomFullException extends RuntimeException {

    public RoomFullException(String roomId) {
        super("Room is full: " + roomId);
    }

    public RoomFullException(String roomId, int maxParticipants) {
        super("Room " + roomId + " is full (max participants: " + maxParticipants + ")");
    }
}
