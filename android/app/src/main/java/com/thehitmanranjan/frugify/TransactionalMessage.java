package com.thehitmanranjan.frugify;

public class TransactionalMessage {
    public String sender;
    public String message;
    public long timestamp;

    public TransactionalMessage(String sender, String message, long timestamp) {
        this.sender = sender;
        this.message = message;
        this.timestamp = timestamp;
    }
}
