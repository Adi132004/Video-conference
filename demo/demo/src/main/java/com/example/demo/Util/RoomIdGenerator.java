package com.example.demo.Util;


import java.security.SecureRandom;

public class RoomIdGenerator {

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generate() {
        return generate(Constants.ROOM_ID_LENGTH);
    }

    public static String generate(int length) {
        StringBuilder roomId = new StringBuilder(length);

        for (int i = 0; i < length; i++) {
            int index = RANDOM.nextInt(CHARACTERS.length());
            roomId.append(CHARACTERS.charAt(index));
        }

        return roomId.toString();
    }

    public static boolean isValid(String roomId) {
        if (roomId == null || roomId.isEmpty()) {
            return false;
        }

        if (roomId.length() < 4 || roomId.length() > 20) {
            return false;
        }

        return roomId.matches("^[A-Z0-9]+$");
    }

    private RoomIdGenerator() {}
}
