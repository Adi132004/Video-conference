package com.example.demo.Service;


import com.example.demo.models.Room;
import com.example.demo.models.Participant;
import com.example.demo.Util.RoomIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    /**
     * Create a new room with auto-generated ID
     */
    public Room createRoom() {
        String roomId = RoomIdGenerator.generate();
        return createRoom(roomId);
    }

    /**
     * Create a new room with specific ID
     */
    public Room createRoom(String roomId) {
        Room room = Room.builder()
                .roomId(roomId)
                .createdAt(LocalDateTime.now())
                .lastActivity(LocalDateTime.now())
                .build();

        rooms.put(roomId, room);
        log.info("Created room: {}", roomId);

        return room;
    }

    /**
     * Get room by ID
     */
    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }

    /**
     * Add participant to room
     */
    public void addParticipant(String roomId, Participant participant) {
        Room room = rooms.get(roomId);
        if (room != null) {
            room.addParticipant(participant);
            log.info("Added participant {} to room {}", participant.getUserId(), roomId);
        }
    }

    /**
     * Remove participant from room
     */
    public void removeParticipant(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room != null) {
            room.removeParticipant(userId);
            log.info("Removed participant {} from room {}", userId, roomId);

            // Delete room if empty
            if (room.isEmpty()) {
                rooms.remove(roomId);
                log.info("Deleted empty room: {}", roomId);
            }
        }
    }

    /**
     * Get all rooms
     */
    public Map<String, Room> getAllRooms() {
        return rooms;
    }
}