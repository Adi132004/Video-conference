package com.example.demo.models;


/**
 * Enum representing all possible signaling message types
 */
public enum MessageType {
    // Room Management
    JOIN,              // User wants to join a room
    LEAVE,             // User is leaving the room
    ROOM_JOINED,       // Confirmation that user joined successfully
    USER_JOINED,       // Broadcast when a new user joins
    USER_LEFT,         // Broadcast when a user leaves

    // WebRTC Signaling
    OFFER,             // WebRTC SDP offer
    ANSWER,            // WebRTC SDP answer
    ICE_CANDIDATE,     // ICE candidate for NAT traversal

    // Media State
    MEDIA_STATE,       // Audio/video enabled state changes

    // Room Info
    ROOM_INFO,         // Room information (participant count, etc.)

    // Errors
    ERROR              // Error message
}