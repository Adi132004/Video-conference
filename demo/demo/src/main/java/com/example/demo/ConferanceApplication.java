package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ConferanceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConferanceApplication.class, args);
		System.out.println("🚀 Signaling Server Started!");
		System.out.println("📡 WebSocket endpoint: ws://localhost:8080/ws");
	}

}
