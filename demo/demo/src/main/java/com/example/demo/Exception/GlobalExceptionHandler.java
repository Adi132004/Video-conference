package com.example.demo.Exception;


import com.example.demo.models.MessageType;
import com.example.demo.models.SignalingMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for REST API endpoints
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RoomNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleRoomNotFoundException(RoomNotFoundException ex) {
        log.error("Room not found: {}", ex.getMessage());

        Map<String, Object> error = new HashMap<>();
        error.put("error", "ROOM_NOT_FOUND");
        error.put("message", ex.getMessage());
        error.put("timestamp", System.currentTimeMillis());

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(error);
    }

    @ExceptionHandler(RoomFullException.class)
    public ResponseEntity<Map<String, Object>> handleRoomFullException(RoomFullException ex) {
        log.error("Room is full: {}", ex.getMessage());

        Map<String, Object> error = new HashMap<>();
        error.put("error", "ROOM_FULL");
        error.put("message", ex.getMessage());
        error.put("timestamp", System.currentTimeMillis());

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);

        Map<String, Object> error = new HashMap<>();
        error.put("error", "INTERNAL_ERROR");
        error.put("message", "An unexpected error occurred");
        error.put("timestamp", System.currentTimeMillis());

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error);
    }
}
