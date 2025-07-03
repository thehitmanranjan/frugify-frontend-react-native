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
            "com.simpl.android", // Simpl
            "in.amazon.mShop.android.shopping", // Amazon Shopping
    };

    // Regex to identify transactional senders (e.g., XX-ICICI, VK-HDFCBK)
    // This is a basic pattern and might need refinement.
    private static final Pattern SENDER_PATTERN = Pattern.compile("^[A-Z]{2}-[A-Z0-9]{5,}$");

    // Keywords to identify transactional messages
    private static final String[] TRANSACTIONAL_KEYWORDS = {
            "credited", "debited",
            "transaction", "spent", "received", "A/C", "ac no", "account", "UPI", "txn",
            "INR", "Rs.", "sent", "received", "transfer", "withdrawal", "deposit",
            // More keywords can be added
    };

    // This list will hold our captured messages. In a real app, this would be
    // persisted.
    // For now, it's in-memory for simplicity as per requirements.
    public static List<TransactionalMessage> capturedMessages = new ArrayList<>();

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

        // Also consider any app that might send transactional alerts, not just the
        // explicitly listed ones.
        // This part might require more sophisticated logic or relying on the content
        // analysis.
        // For now, we'll proceed if it's a target app OR if the content looks
        // transactional.

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
            // Secondary filter: For other apps, is the content itself strongly indicative
            // of a transaction?
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
        if (title == null)
            return false;
        if (isSimplOrAmazonPay(title)) {
            // For Simpl or Amazon Pay, skip SENDER_PATTERN and rely on content
            Log.d(TAG, "Sender is Simpl or Amazon Pay, skipping SENDER_PATTERN check.");
            return true;
        }
        Matcher matcher = SENDER_PATTERN.matcher(title);
        if (matcher.find()) {
            Log.d(TAG, "Potentially transactional sender: " + title);
            return true;
        }
        // Also check for common bank names if not matching the XX-BANK pattern
        String lowerTitle = title.toLowerCase();
        if (lowerTitle.contains("bank") || lowerTitle.contains("card") || lowerTitle.contains("finance")
                || lowerTitle.contains("paytm") || lowerTitle.contains("gpay")) {
            Log.d(TAG, "Sender contains bank/payment keyword: " + title);
            return true;
        }
        return false;
    }

    private boolean isTransactionalContent(String text) {
        if (text == null)
            return false;
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

        if (isSimplOrAmazonPay(title)) {
            // For Simpl or Amazon Pay, skip SENDER_PATTERN and rely on content
            Log.d(TAG, "Sender is Simpl or Amazon Pay, skipping SENDER_PATTERN check in isTransactional.");
            return isTransactionalContent(message);
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
            // This helps avoid flagging personal messages that might contain words like
            // "payment"
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
        // For Simpl or Amazon Pay, always treat as business sender
        if (isSimplOrAmazonPay(title)) {
            Log.d(TAG, "Sender is Simpl or Amazon Pay, treating as business sender.");
            return true;
        }
        // Avoid flagging senders that are likely personal contact names
        // Simple check: if title contains spaces and is not matching common business
        // patterns
        if (title.contains(" ") && !SENDER_PATTERN.matcher(title).find()) {
            // More sophisticated checks could involve looking for +[country code] or known
            // business names
            if (title.matches("^\\+[0-9\\s]+$")) { // Looks like a phone number
                Log.d(TAG, "Sender looks like a phone number, potentially business: " + title);
                return true;
            }
            Log.d(TAG, "Sender '" + title + "' might be a personal contact, being cautious.");
            return false; // Likely a person's name
        }
        return true; // Likely a business shortcode, app name, or single word name
    }

    private boolean isSimplOrAmazonPay(String title) {
        if (title == null)
            return false;
        String lowerTitle = title.toLowerCase();
        return lowerTitle.contains("simpl") || lowerTitle.contains("amazon pay");
    }

    private void saveMessage(String sender, String message, long timestamp) {
        // For now, just log and add to in-memory list.
        // Later, this will be passed to React Native.
        Log.i(TAG, "Saving Transactional Message: Sender='" + sender + "', Message='" + message + "', Timestamp="
                + timestamp);
        synchronized (capturedMessages) {
            capturedMessages.add(new TransactionalMessage(sender, message, timestamp));
            // Optional: Limit the size of the list
            // if (capturedMessages.size() > MAX_MESSAGES) {
            // capturedMessages.remove(0);
            // }
        }
        // TODO: Implement a way to send this data to React Native, possibly via a
        // bridge or events
    }

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
            // Return a copy to avoid concurrent modification issues if accessed from
            // multiple threads
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
