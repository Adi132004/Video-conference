package com.example.demo.Exception;


/**
 * Exception thrown when a room is not found
 */
public class RoomNotFoundException extends RuntimeException {

    public RoomNotFoundException(String roomId) {
        super("Room not found: " + roomId);
    }

    public RoomNotFoundException(String roomId, Throwable cause) {
        super("Room not found: " + roomId, cause);
    }
}