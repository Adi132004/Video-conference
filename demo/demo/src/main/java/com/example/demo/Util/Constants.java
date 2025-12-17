package com.example.demo.Util;


public class Constants {

    public static final int DEFAULT_MAX_PARTICIPANTS = 10;
    public static final int ROOM_ID_LENGTH = 8;
    public static final long ROOM_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
    public static final long ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

    public static final String ERROR_ROOM_NOT_FOUND = "Room not found";
    public static final String ERROR_ROOM_FULL = "Room is full";
    public static final String ERROR_INVALID_MESSAGE = "Invalid message format";

    private Constants() {}
}