package com.example.demo.Controller;

import com.example.demo.Exception.RoomNotFoundException;
import com.example.demo.models.Participant;
import com.example.demo.models.Room;
import com.example.demo.Service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST API controller for room management
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RoomController {

    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * Create a new room
     * POST /api/rooms/create
     */
    @PostMapping("/rooms/create")
    public ResponseEntity<Map<String, Object>> createRoom() {
        Room room = roomService.createRoom();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("roomId", room.getRoomId());
        response.put("createdAt", room.getCreatedAt().toString());
        response.put("maxParticipants", room.getMaxParticipants());

        log.info("REST: Created room via API: {}", room.getRoomId());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * Get room information
     * GET /api/rooms/{roomId}
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(@PathVariable String roomId) {
        Room room = roomService.getRoom(roomId);

        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("roomId", room.getRoomId());
        response.put("participantCount", room.getParticipantCount());
        response.put("maxParticipants", room.getMaxParticipants());
        response.put("createdAt", room.getCreatedAt().toString());
        response.put("lastActivity", room.getLastActivity().toString());
        response.put("isEmpty", room.isEmpty());
        response.put("isFull", room.isFull());

        log.info("REST: Retrieved room info: {}", roomId);

        return ResponseEntity.ok(response);
    }

    /**
     * Get list of participants in a room
     * GET /api/rooms/{roomId}/participants
     */
    @GetMapping("/rooms/{roomId}/participants")
    public ResponseEntity<Map<String, Object>> getParticipants(@PathVariable String roomId) {
        Room room = roomService.getRoom(roomId);

        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }

        // Convert participants to safe DTOs (without WebSocketSession)
        List<Map<String, Object>> participantList = room.getParticipants().values().stream()
                .map(p -> {
                    Map<String, Object> participantData = new HashMap<>();
                    participantData.put("userId", p.getUserId());
                    participantData.put("name", p.getName());
                    participantData.put("joinedAt", p.getJoinedAt().toString());
                    participantData.put("audioEnabled", p.isAudioEnabled());
                    participantData.put("videoEnabled", p.isVideoEnabled());
                    participantData.put("connected", p.isConnected());
                    return participantData;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("roomId", roomId);
        response.put("participantCount", room.getParticipantCount());
        response.put("participants", participantList);

        log.info("REST: Retrieved {} participants for room {}", participantList.size(), roomId);

        return ResponseEntity.ok(response);
    }

    /**
     * Get all active rooms (for debugging)
     * GET /api/rooms
     */
    @GetMapping("/rooms")
    public ResponseEntity<Map<String, Object>> getAllRooms() {
        Map<String, Room> rooms = roomService.getAllRooms();

        List<Map<String, Object>> roomList = rooms.values().stream()
                .map(room -> {
                    Map<String, Object> roomData = new HashMap<>();
                    roomData.put("roomId", room.getRoomId());
                    roomData.put("participantCount", room.getParticipantCount());
                    roomData.put("createdAt", room.getCreatedAt().toString());
                    return roomData;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("totalRooms", rooms.size());
        response.put("rooms", roomList);

        log.info("REST: Retrieved all rooms: {} total", rooms.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "WebRTC Signaling Server");
        response.put("timestamp", System.currentTimeMillis());
        response.put("activeRooms", roomService.getAllRooms().size());

        return ResponseEntity.ok(response);
    }
}