package com.thehitmanranjan.frugify;

import java.util.UUID;

public class TransactionalMessage {
    public String id;
    public String sender;
    public String message;
    public long timestamp;
    public String status; // e.g., "unprocessed", "processed"

    public TransactionalMessage(String sender, String message, long timestamp) {
        this.id = UUID.randomUUID().toString();
        this.sender = sender;
        this.message = message;
        this.timestamp = timestamp;
        this.status = "unprocessed";
    }

    // Constructor for deserialization from JSON
    public TransactionalMessage(String id, String sender, String message, long timestamp, String status) {
        this.id = id;
        this.sender = sender;
        this.message = message;
        this.timestamp = timestamp;
        this.status = status;
    }

    // Default constructor for JSON deserialization libraries if needed
    public TransactionalMessage() {}
}
