package com.thehitmanranjan.frugify;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NotificationListener extends NotificationListenerService {

    private static final String TAG = "NotificationListener";
    private static final String[] TARGET_APPS = {
            "com.google.android.apps.messaging", // Google Messages
            "com.whatsapp",                      // WhatsApp
            "org.telegram.messenger"             // Telegram
            // We can add more package names here for other relevant apps
    };

    // Regex to identify transactional senders (e.g., XX-ICICI, VK-HDFCBK)
    // This is a basic pattern and might need refinement.
    private static final Pattern SENDER_PATTERN = Pattern.compile("^[A-Z]{2}-[A-Z0-9]{5,}$");

    // Keywords to identify transactional messages
    private static final String[] TRANSACTIONAL_KEYWORDS = {
            "OTP", "one time password", "verification code", "payment", "credited", "debited",
            "transaction", "spent", "received", "A/C", "ac no", "account", "UPI", "txn",
            "INR", "Rs."
            // More keywords can be added
    };

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Collections;
import java.util.Comparator;
// Removed public static List<TransactionalMessage> capturedMessages = new ArrayList<>();

public class NotificationListener extends NotificationListenerService {

    private static final String TAG = "NotificationListener";
    private static final String PREFS_NAME = "TransactionalMessagesPrefs";
    private static final String MESSAGES_KEY = "messages";
    private static final int MAX_MESSAGES_TO_KEEP_FOR_DISPLAY = 50; // Max messages to show in UI to prevent clutter

    // Target apps and keywords remain the same

    private static final String[] TARGET_APPS = {
            "com.google.android.apps.messaging", // Google Messages
            "com.whatsapp",                      // WhatsApp
            "org.telegram.messenger"             // Telegram
    };
    private static final Pattern SENDER_PATTERN = Pattern.compile("^[A-Z]{2}-[A-Z0-9]{5,}$");
    private static final String[] TRANSACTIONAL_KEYWORDS = {
            "OTP", "one time password", "verification code", "payment", "credited", "debited",
            "transaction", "spent", "received", "A/C", "ac no", "account", "UPI", "txn",
            "INR", "Rs."
    };


    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        super.onNotificationPosted(sbn);

        String packageName = sbn.getPackageName();
        boolean isTargetApp = false;
        for (String app : TARGET_APPS) {
            if (app.equals(packageName)) {
                isTargetApp = true;
                break;
            }
        }

        // Also consider any app that might send transactional alerts, not just the explicitly listed ones.
        // This part might require more sophisticated logic or relying on the content analysis.
        // For now, we'll proceed if it's a target app OR if the content looks transactional.

        Notification notification = sbn.getNotification();
        if (notification == null) {
            return;
        }

        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        String title = extras.getString(Notification.EXTRA_TITLE); // Often the sender
        CharSequence textSequence = extras.getCharSequence(Notification.EXTRA_TEXT); // Message body
        String text = (textSequence != null) ? textSequence.toString() : null;

        long timestamp = sbn.getPostTime();

        Log.d(TAG, "Notification From: " + packageName + ", Title: " + title + ", Text: " + text);

        if (title == null || text == null) {
            Log.d(TAG, "Notification title or text is null, skipping.");
            return;
        }

        // Primary filter: Is it from one of the target messaging apps?
        if (isTargetApp) {
            // For target apps, apply stricter transactional content filtering
            if (isTransactional(title, text)) {
                Log.i(TAG, "Transactional Message Captured from Target App: " + title + " - " + text);
                saveMessage(title, text, timestamp);
            } else {
                Log.d(TAG, "Non-transactional message from target app: " + title);
            }
        } else {
            // Secondary filter: For other apps, is the content itself strongly indicative of a transaction?
            // This helps catch bank app notifications etc.
            // We might want to be more lenient or have a different keyword set for these.
            if (isPotentiallyTransactionalSender(title) && isTransactionalContent(text)) {
                 Log.i(TAG, "Transactional Message Captured from Other App: " + title + " - " + text);
                 saveMessage(title, text, timestamp);
            } else {
                Log.d(TAG, "Ignoring notification from non-target app or non-transactional content: " + packageName);
            }
        }
    }

    private boolean isPotentiallyTransactionalSender(String title) {
        if (title == null) return false;
        Matcher matcher = SENDER_PATTERN.matcher(title);
        if (matcher.find()) {
            Log.d(TAG, "Potentially transactional sender: " + title);
            return true;
        }
        // Also check for common bank names if not matching the XX-BANK pattern
        String lowerTitle = title.toLowerCase();
        if (lowerTitle.contains("bank") || lowerTitle.contains("card") || lowerTitle.contains("finance") || lowerTitle.contains("paytm") || lowerTitle.contains("gpay")) {
            Log.d(TAG, "Sender contains bank/payment keyword: " + title);
            return true;
        }
        return false;
    }

    private boolean isTransactionalContent(String text) {
        if (text == null) return false;
        String lowerText = text.toLowerCase();
        for (String keyword : TRANSACTIONAL_KEYWORDS) {
            if (lowerText.contains(keyword.toLowerCase())) {
                Log.d(TAG, "Transactional keyword found in text: " + keyword);
                return true;
            }
        }
        return false;
    }


    private boolean isTransactional(String title, String message) {
        if (title == null || message == null) {
            return false;
        }

        // Check 1: Sender format (e.g., XX-ICICI)
        Matcher senderMatcher = SENDER_PATTERN.matcher(title);
        if (senderMatcher.find()) {
            Log.d(TAG, "Sender pattern matched for: " + title);
            // If sender pattern matches, it's highly likely transactional.
            // We can add further checks on message content if needed.
            return isTransactionalContent(message);
        }

        // Check 2: Keywords in message content
        if (isTransactionalContent(message)) {
            Log.d(TAG, "Transactional keyword found in message: " + message);
            // If keywords are found, check if the sender is likely a business or service
            // This helps avoid flagging personal messages that might contain words like "payment"
            if (isPotentiallyBusinessSender(title)) {
                return true;
            }
        }

        // Check 3: Specific patterns for OTPs if not caught by keywords
        if (message.toLowerCase().contains("otp") && message.matches(".*\\b\\d{4,8}\\b.*")) {
            Log.d(TAG, "OTP pattern matched for: " + message);
            return true; // OTPs are always transactional
        }


        Log.d(TAG, "Message deemed non-transactional: " + title + " - " + message);
        return false;
    }

    private boolean isPotentiallyBusinessSender(String title) {
        // Avoid flagging senders that are likely personal contact names
        // Simple check: if title contains spaces and is not matching common business patterns
        if (title.contains(" ") && !SENDER_PATTERN.matcher(title).find()) {
            // More sophisticated checks could involve looking for +[country code] or known business names
            if (title.matches("^\\+[0-9\\s]+$")) { // Looks like a phone number
                 Log.d(TAG, "Sender looks like a phone number, potentially business: " + title);
                return true;
            }
            Log.d(TAG, "Sender '" + title + "' might be a personal contact, being cautious.");
            return false; // Likely a person's name
        }
        return true; // Likely a business shortcode, app name, or single word name
    }


    private void saveMessage(String sender, String messageContent, long timestamp) {
        Log.i(TAG, "Attempting to save Transactional Message: Sender='" + sender + "', Message='" + messageContent + "'");
        TransactionalMessage newMessage = new TransactionalMessage(sender, messageContent, timestamp);
        List<TransactionalMessage> messages = getAllMessagesPriv(getApplicationContext());
        messages.add(newMessage);
        saveMessagesPriv(getApplicationContext(), messages);
        Log.i(TAG, "Saved new message with ID: " + newMessage.id);
    }

    private static synchronized List<TransactionalMessage> getAllMessagesPriv(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(MESSAGES_KEY, "[]");
        List<TransactionalMessage> messages = new ArrayList<>();
        try {
            JSONArray jsonArray = new JSONArray(json);
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject jsonObj = jsonArray.getJSONObject(i);
                messages.add(new TransactionalMessage(
                        jsonObj.getString("id"),
                        jsonObj.getString("sender"),
                        jsonObj.getString("message"),
                        jsonObj.getLong("timestamp"),
                        jsonObj.optString("status", "unprocessed") // Default to unprocessed if status is missing
                ));
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing messages from SharedPreferences", e);
            // If parsing fails, potentially clear corrupted data or return empty list
            // For now, returning empty list to avoid crash, but this means data loss.
            return new ArrayList<>();
        }
        return messages;
    }

    private static synchronized void saveMessagesPriv(Context context, List<TransactionalMessage> messages) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        JSONArray jsonArray = new JSONArray();
        for (TransactionalMessage msg : messages) {
            try {
                JSONObject jsonObj = new JSONObject();
                jsonObj.put("id", msg.id);
                jsonObj.put("sender", msg.sender);
                jsonObj.put("message", msg.message);
                jsonObj.put("timestamp", msg.timestamp);
                jsonObj.put("status", msg.status);
                jsonArray.put(jsonObj);
            } catch (JSONException e) {
                Log.e(TAG, "Error creating JSON for message: " + msg.id, e);
            }
        }
        editor.putString(MESSAGES_KEY, jsonArray.toString());
        editor.apply();
    }

    // Public static methods for NotificationModule to call

    public static List<TransactionalMessage> getUnprocessedMessagesForDisplay(Context context) {
        List<TransactionalMessage> allMessages = getAllMessagesPriv(context);
        List<TransactionalMessage> unprocessedMessages = new ArrayList<>();
        for (TransactionalMessage msg : allMessages) {
            if ("unprocessed".equals(msg.status)) {
                unprocessedMessages.add(msg);
            }
        }
        // Sort by timestamp descending (newest first) for display
        Collections.sort(unprocessedMessages, new Comparator<TransactionalMessage>() {
            @Override
            public int compare(TransactionalMessage m1, TransactionalMessage m2) {
                return Long.compare(m2.timestamp, m1.timestamp);
            }
        });
        // Limit the number of messages for display
        if (unprocessedMessages.size() > MAX_MESSAGES_TO_KEEP_FOR_DISPLAY) {
            return unprocessedMessages.subList(0, MAX_MESSAGES_TO_KEEP_FOR_DISPLAY);
        }
        return unprocessedMessages;
    }

    public static List<TransactionalMessage> getUnprocessedMessagesForBackend(Context context) {
        List<TransactionalMessage> allMessages = getAllMessagesPriv(context);
        List<TransactionalMessage> unprocessedMessages = new ArrayList<>();
        for (TransactionalMessage msg : allMessages) {
            if ("unprocessed".equals(msg.status)) {
                unprocessedMessages.add(msg);
            }
        }
         // Sort by timestamp ascending (oldest first) for processing by backend
        Collections.sort(unprocessedMessages, new Comparator<TransactionalMessage>() {
            @Override
            public int compare(TransactionalMessage m1, TransactionalMessage m2) {
                return Long.compare(m1.timestamp, m2.timestamp);
            }
        });
        return unprocessedMessages;
    }

    public static void markMessageAsProcessing(Context context, String messageId) {
        List<TransactionalMessage> messages = getAllMessagesPriv(context);
        boolean found = false;
        for (TransactionalMessage msg : messages) {
            if (msg.id.equals(messageId)) {
                msg.status = "processing"; // Optional: if you want an intermediate state
                found = true;
                break;
            }
        }
        if (found) {
            saveMessagesPriv(context, messages);
            Log.i(TAG, "Marked message as processing: " + messageId);
        } else {
            Log.w(TAG, "Message not found to mark as processing: " + messageId);
        }
    }

    public static void deleteMessage(Context context, String messageId) {
        List<TransactionalMessage> messages = getAllMessagesPriv(context);
        List<TransactionalMessage> updatedMessages = new ArrayList<>();
        boolean found = false;
        for (TransactionalMessage msg : messages) {
            if (msg.id.equals(messageId)) {
                found = true; // Mark as found but don't add to updated list
            } else {
                updatedMessages.add(msg);
            }
        }
        if (found) {
            saveMessagesPriv(context, updatedMessages);
            Log.i(TAG, "Deleted message: " + messageId);
        } else {
            Log.w(TAG, "Message not found for deletion: " + messageId);
        }
    }


    // Clear all messages - for debugging or if ever needed
    public static void clearAllMessages(Context context) {
        saveMessagesPriv(context, new ArrayList<TransactionalMessage>());
        Log.i(TAG, "Cleared all messages from SharedPreferences.");
    }


    // The old getCapturedMessages and clearMessages are removed as they used the in-memory list.
    // public static List<TransactionalMessage> getCapturedMessages() { ... }
    // public static void clearMessages() { ... }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        super.onNotificationRemoved(sbn);
        Log.d(TAG, "Notification Removed: " + sbn.getPackageName());
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "NotificationListener Service Created.");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "NotificationListener Service Destroyed.");
    }

    // Static method to retrieve messages (e.g., for React Native module to call)
    public static List<TransactionalMessage> getCapturedMessages() {
        synchronized (capturedMessages) {
            // Return a copy to avoid concurrent modification issues if accessed from multiple threads
            return new ArrayList<>(capturedMessages);
        }
    }

    public static void clearMessages() {
        synchronized (capturedMessages) {
            capturedMessages.clear();
            Log.i(TAG, "Cleared all captured messages.");
        }
    }
}
