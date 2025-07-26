package com.thehitmanranjan.frugify;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

public class NotificationListener extends NotificationListenerService {

    private static final String TAG = "NotificationListener";
    private static final String[] TARGET_APPS = {
            "com.google.android.apps.messaging", // Google Messages
            "com.simpl.android", // Simpl
    };

    // Keywords to identify transactional messages
    private static final String[] TRANSACTIONAL_KEYWORDS = {
            "credited", "debited",
            "transaction", "spent", "received", "A/C", "ac no", "account", "UPI", "txn",
            "INR", "Rs.", "sent", "received", "transfer", "withdrawal", "deposit",
            "charged", "simpl", "zomato", "swiggy", "amazon", "flipkart", "payment",
            "purchase", "order", "bill", "invoice", "refund", "cashback", "charged"
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
        // Exclude Gmail notifications to avoid duplication
        if ("com.google.android.gm".equals(packageName)) {
            Log.d(TAG, "Ignoring Gmail notification to avoid duplication.");
            return;
        }
        boolean isTargetApp = false;
        for (String app : TARGET_APPS) {
            if (app.equals(packageName)) {
                isTargetApp = true;
                break;
            }
        }

        // Also consider any app that might send transactional alerts, not just the
        // explicitly listed ones.
        // For now, we'll proceed if it's a target app.

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

        // Check for sensitive notification content hidden case first
        if ((text != null && (text.toLowerCase().contains("sensitive notification content hidden") ||
                text.toLowerCase().contains("notification content hidden") ||
                text.toLowerCase().contains("content hidden"))) ||
                (title != null && (title.toLowerCase().contains("sensitive notification content hidden") ||
                        title.toLowerCase().contains("notification content hidden") ||
                        title.toLowerCase().contains("content hidden")))) {
            Log.i(TAG, "Sensitive notification content detected, saving special message");
            saveMessage("System", "sensitive notification content hidden", timestamp);
            return;
        }

        // Also check if we have null/empty content from potentially transactional apps
        if ((title == null || title.trim().isEmpty()) && (text == null || text.trim().isEmpty())) {
            // Check if this is from a banking or payment app
            if (isLikelyBankingOrPaymentApp(packageName)) {
                Log.i(TAG, "Empty notification from banking/payment app - likely sensitive content hidden");
                saveMessage("System", "sensitive notification content hidden", timestamp);
                return;
            }
        }

        if (title == null || text == null) {
            Log.d(TAG, "Notification title or text is null, skipping.");
            return;
        }

        // Only process notifications from target apps
        if (isTargetApp) {
            // For target apps, apply transactional content filtering
            if (isTransactional(title, text)) {
                Log.i(TAG, "Transactional Message Captured from Target App: " + title + " - " + text);
                saveMessage(title, text, timestamp);
            } else {
                Log.d(TAG, "Non-transactional message from target app: " + title);
            }
        } else {
            // Ignore all notifications from non-target apps
            Log.d(TAG, "Ignoring notification from non-target app: " + packageName);
        }
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

        // Check if message contains content from known payment services
        if (message.toLowerCase().contains("simpl") || message.toLowerCase().contains("amazon pay")) {
            Log.d(TAG, "Message contains known payment service content, checking for transactional keywords.");
            if (isTransactionalContent(message)) {
                Log.d(TAG, "Payment service transaction detected in message content.");
                return true;
            }
        }

        if (isKnownPaymentService(title)) {
            // For known payment services, skip pattern checks and rely on content
            Log.d(TAG, "Sender is from known payment service, checking transactional content.");
            return isTransactionalContent(message);
        }

        // Check for transactional keywords in message content
        if (isTransactionalContent(message)) {
            Log.d(TAG, "Transactional keyword found in message: " + message);
            return true;
        }

        // Check for OTP patterns
        if (message.toLowerCase().contains("otp") && message.matches(".*\\b\\d{4,8}\\b.*")) {
            Log.d(TAG, "OTP pattern matched for: " + message);
            return true; // OTPs are always transactional
        }

        Log.d(TAG, "Message deemed non-transactional: " + title + " - " + message);
        return false;
    }

    private boolean isKnownPaymentService(String title) {
        if (title == null)
            return false;
        String lowerTitle = title.toLowerCase();

        // Check for known payment service names and common transaction titles
        return lowerTitle.contains("simpl") ||
                lowerTitle.contains("amazon pay") ||
                lowerTitle.equals("transaction success") ||
                lowerTitle.equals("payment successful") ||
                lowerTitle.equals("transaction complete") ||
                lowerTitle.equals("payment complete");
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

    private boolean isLikelyBankingOrPaymentApp(String packageName) {
        if (packageName == null)
            return false;
        String lowerPackage = packageName.toLowerCase();

        // Common banking and payment app package patterns
        return lowerPackage.contains("bank") ||
                lowerPackage.contains("pay") ||
                lowerPackage.contains("wallet") ||
                lowerPackage.contains("upi") ||
                lowerPackage.contains("finance") ||
                lowerPackage.contains("money") ||
                lowerPackage.contains("credit") ||
                lowerPackage.contains("debit") ||
                lowerPackage.contains("sbi") ||
                lowerPackage.contains("hdfc") ||
                lowerPackage.contains("icici") ||
                lowerPackage.contains("axis") ||
                lowerPackage.contains("kotak") ||
                lowerPackage.contains("paytm") ||
                lowerPackage.contains("phonepe") ||
                lowerPackage.contains("gpay") ||
                lowerPackage.contains("googlepay") ||
                lowerPackage.contains("bhim") ||
                packageName.equals("com.simpl.android");
    }
}
