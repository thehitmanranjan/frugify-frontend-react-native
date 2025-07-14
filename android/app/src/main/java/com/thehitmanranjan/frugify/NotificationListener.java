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
            "com.whatsapp", // WhatsApp
            "org.telegram.messenger" // Telegram
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

    // This list will hold our captured messages. In a real app, this would be
    // persisted.
    // For now, it's in-memory for simplicity as per requirements.
    public static List<TransactionalMessage> capturedMessages = new ArrayList<>();

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        super.onNotificationPosted(sbn);

        String packageName = sbn.getPackageName();
        Log.i(TAG, "🔔 NEW NOTIFICATION DETECTED! Package: " + packageName);

        boolean isTargetApp = false;
        for (String app : TARGET_APPS) {
            if (app.equals(packageName)) {
                isTargetApp = true;
                Log.i(TAG, "✅ Target app detected: " + packageName);
                break;
            }
        }

        if (!isTargetApp) {
            Log.d(TAG, "❌ Not a target app: " + packageName);
        }

        // Also consider any app that might send transactional alerts, not just the
        // explicitly listed ones.
        // This part might require more sophisticated logic or relying on the content
        // analysis.
        // For now, we'll proceed if it's a target app OR if the content looks
        // transactional.

        Notification notification = sbn.getNotification();
        if (notification == null) {
            Log.w(TAG, "⚠️ Notification object is null, skipping");
            return;
        }

        Bundle extras = notification.extras;
        if (extras == null) {
            Log.w(TAG, "⚠️ Notification extras bundle is null, skipping");
            return;
        }

        String title = extras.getString(Notification.EXTRA_TITLE); // Often the sender
        CharSequence textSequence = extras.getCharSequence(Notification.EXTRA_TEXT); // Message body
        String text = (textSequence != null) ? textSequence.toString() : null;

        // Try alternative ways to get content if main content is hidden
        if (text == null || text.contains("Sensitive notification content hidden") || text.contains("hidden")) {
            Log.w(TAG, "⚠️ Primary content is hidden, trying alternative extraction methods...");

            // Try EXTRA_BIG_TEXT
            CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (bigText != null && !bigText.toString().contains("hidden")) {
                text = bigText.toString();
                Log.i(TAG, "✅ Got content from EXTRA_BIG_TEXT: " + text);
            }

            // Try EXTRA_SUB_TEXT
            if (text == null || text.contains("hidden")) {
                CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
                if (subText != null && !subText.toString().contains("hidden")) {
                    text = subText.toString();
                    Log.i(TAG, "✅ Got content from EXTRA_SUB_TEXT: " + text);
                }
            }

            // Try EXTRA_INFO_TEXT
            if (text == null || text.contains("hidden")) {
                CharSequence infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);
                if (infoText != null && !infoText.toString().contains("hidden")) {
                    text = infoText.toString();
                    Log.i(TAG, "✅ Got content from EXTRA_INFO_TEXT: " + text);
                }
            }

            // Try to get title as sender if title is empty
            if (title == null || title.trim().isEmpty()) {
                title = extras.getString(Notification.EXTRA_SUB_TEXT);
                if (title != null) {
                    Log.i(TAG, "✅ Got sender from EXTRA_SUB_TEXT: " + title);
                }
            }
        }

        long timestamp = sbn.getPostTime();

        // Log detailed notification information with emojis
        Log.i(TAG, "📱 NOTIFICATION DETAILS:");
        Log.i(TAG, "   📤 Package: " + packageName);
        Log.i(TAG, "   👤 Sender/Title: " + title);
        Log.i(TAG, "   💬 Message: " + text);
        Log.i(TAG, "   🕐 Timestamp: " + timestamp);
        Log.i(TAG, "   🎯 Is Target App: " + isTargetApp);

        // Check for sensitive content blocking
        if (text != null && (text.contains("Sensitive notification content hidden") ||
                text.contains("content hidden") ||
                text.contains("hidden"))) {
            Log.w(TAG, "🔒 SENSITIVE CONTENT DETECTED!");
            Log.w(TAG, "   ⚠️ Android is blocking notification content access");
            Log.w(TAG, "   💡 Solutions:");
            Log.w(TAG, "   📱 1. Check Settings → Privacy → Lock Screen → Show sensitive content");
            Log.w(TAG, "   💬 2. Check Google Messages → Privacy → Show content in notifications");
            Log.w(TAG, "   🔓 3. Grant additional permissions in notification settings");

            // Try to log all available extras for debugging
            Log.d(TAG, "🔍 DEBUGGING - All notification extras:");
            for (String key : extras.keySet()) {
                Object value = extras.get(key);
                Log.d(TAG, "   🔑 " + key + " = " + value);
            }
        }

        if (title == null || text == null) {
            Log.w(TAG, "⚠️ Notification title or text is null - Title: " + title + ", Text: " + text);
            if (text != null && text.contains("hidden")) {
                Log.e(TAG, "❌ CRITICAL: Content is being hidden by Android privacy settings!");
            }
            return;
        }

        // Skip processing if content is still hidden after all attempts
        if (text != null && (text.contains("Sensitive notification content hidden") ||
                text.contains("content hidden") ||
                text.toLowerCase().contains("hidden"))) {
            Log.w(TAG, "⚠️ Skipping processing - content still hidden after extraction attempts");
            return;
        }

        // Primary filter: Is it from one of the target messaging apps?
        if (isTargetApp) {
            Log.i(TAG, "🎯 ANALYZING TARGET APP MESSAGE...");
            // For target apps, apply stricter transactional content filtering
            if (isTransactional(title, text)) {
                Log.i(TAG, "💸 TRANSACTIONAL MESSAGE CAPTURED FROM TARGET APP!");
                Log.i(TAG, "   📤 Sender: " + title);
                Log.i(TAG, "   💬 Content: " + text);
                saveMessage(title, text, timestamp);
            } else {
                Log.d(TAG, "❌ Non-transactional message from target app: " + title);
            }
        } else {
            Log.i(TAG, "🔍 ANALYZING NON-TARGET APP MESSAGE...");
            // Secondary filter: For other apps, is the content itself strongly indicative
            // of a transaction?
            // This helps catch bank app notifications etc.
            // We might want to be more lenient or have a different keyword set for these.
            if (isPotentiallyTransactionalSender(title) && isTransactionalContent(text)) {
                Log.i(TAG, "💸 TRANSACTIONAL MESSAGE CAPTURED FROM OTHER APP!");
                Log.i(TAG, "   📤 Sender: " + title);
                Log.i(TAG, "   💬 Content: " + text);
                saveMessage(title, text, timestamp);
            } else {
                Log.d(TAG, "❌ Ignoring notification from non-target app or non-transactional content: " + packageName);
            }
        }
    }

    private boolean isPotentiallyTransactionalSender(String title) {
        if (title == null) {
            Log.d(TAG, "🚫 Title is null, not a transactional sender");
            return false;
        }

        Log.d(TAG, "🔍 Checking if sender is transactional: '" + title + "'");

        Matcher matcher = SENDER_PATTERN.matcher(title);
        if (matcher.find()) {
            Log.i(TAG, "✅ Sender matches transactional pattern: " + title);
            return true;
        }

        // Also check for common bank names if not matching the XX-BANK pattern
        String lowerTitle = title.toLowerCase();
        if (lowerTitle.contains("bank") || lowerTitle.contains("card") || lowerTitle.contains("finance")
                || lowerTitle.contains("paytm") || lowerTitle.contains("gpay")) {
            Log.i(TAG, "🏦 Sender contains banking/payment keyword: " + title);
            return true;
        }

        Log.d(TAG, "❌ Sender doesn't match transactional patterns: " + title);
        return false;
    }

    private boolean isTransactionalContent(String text) {
        if (text == null) {
            Log.d(TAG, "🚫 Text is null, not transactional content");
            return false;
        }

        Log.d(TAG, "🔍 Checking for transactional keywords in: '" + text + "'");

        String lowerText = text.toLowerCase();
        for (String keyword : TRANSACTIONAL_KEYWORDS) {
            if (lowerText.contains(keyword.toLowerCase())) {
                Log.i(TAG, "💰 Transactional keyword found: '" + keyword + "' in message");
                return true;
            }
        }

        Log.d(TAG, "❌ No transactional keywords found in message");
        return false;
    }

    private boolean isTransactional(String title, String message) {
        if (title == null || message == null) {
            Log.w(TAG, "⚠️ Title or message is null - cannot analyze for transactional content");
            return false;
        }

        Log.d(TAG, "🔬 DETAILED TRANSACTIONAL ANALYSIS:");
        Log.d(TAG, "   👤 Analyzing sender: '" + title + "'");
        Log.d(TAG, "   💬 Analyzing message: '" + message + "'");

        // Check 1: Sender format (e.g., XX-ICICI)
        Matcher senderMatcher = SENDER_PATTERN.matcher(title);
        if (senderMatcher.find()) {
            Log.i(TAG, "✅ CHECK 1 PASSED: Sender pattern matched for: " + title);
            // If sender pattern matches, it's highly likely transactional.
            // We can add further checks on message content if needed.
            boolean hasTransactionalContent = isTransactionalContent(message);
            Log.i(TAG, "   📊 Content check result: " + hasTransactionalContent);
            return hasTransactionalContent;
        } else {
            Log.d(TAG, "❌ CHECK 1 FAILED: Sender pattern didn't match");
        }

        // Check 2: Keywords in message content
        if (isTransactionalContent(message)) {
            Log.i(TAG, "✅ CHECK 2 PASSED: Transactional keywords found in message");
            // If keywords are found, check if the sender is likely a business or service
            // This helps avoid flagging personal messages that might contain words like
            // "payment"
            if (isPotentiallyBusinessSender(title)) {
                Log.i(TAG, "✅ CHECK 2 FINAL: Business sender confirmed - TRANSACTIONAL!");
                return true;
            } else {
                Log.d(TAG, "❌ CHECK 2 FAILED: Not a business sender");
            }
        } else {
            Log.d(TAG, "❌ CHECK 2 FAILED: No transactional keywords found");
        }

        // Check 3: Specific patterns for OTPs if not caught by keywords
        if (message.toLowerCase().contains("otp") && message.matches(".*\\b\\d{4,8}\\b.*")) {
            Log.i(TAG, "✅ CHECK 3 PASSED: OTP pattern matched - TRANSACTIONAL!");
            return true; // OTPs are always transactional
        } else {
            Log.d(TAG, "❌ CHECK 3 FAILED: No OTP pattern found");
        }

        Log.i(TAG, "❌ FINAL RESULT: Message deemed NON-TRANSACTIONAL");
        Log.d(TAG, "   👤 Sender: " + title);
        Log.d(TAG, "   💬 Message: " + message);
        return false;
    }

    private boolean isPotentiallyBusinessSender(String title) {
        Log.d(TAG, "🏢 Checking if sender is a business: '" + title + "'");

        // Avoid flagging senders that are likely personal contact names
        // Simple check: if title contains spaces and is not matching common business
        // patterns
        if (title.contains(" ") && !SENDER_PATTERN.matcher(title).find()) {
            // More sophisticated checks could involve looking for +[country code] or known
            // business names
            if (title.matches("^\\+[0-9\\s]+$")) { // Looks like a phone number
                Log.i(TAG, "📞 Sender looks like a business phone number: " + title);
                return true;
            }
            Log.d(TAG, "👤 Sender '" + title + "' might be a personal contact, being cautious.");
            return false; // Likely a person's name
        }

        Log.i(TAG, "🏢 Sender appears to be a business/service: " + title);
        return true; // Likely a business shortcode, app name, or single word name
    }

    private void saveMessage(String sender, String message, long timestamp) {
        Log.i(TAG, "💾 SAVING TRANSACTIONAL MESSAGE:");
        Log.i(TAG, "   📤 Sender: '" + sender + "'");
        Log.i(TAG, "   💬 Message: '" + message + "'");
        Log.i(TAG, "   🕐 Timestamp: " + timestamp);
        Log.i(TAG, "   📊 Current queue size: " + capturedMessages.size());

        synchronized (capturedMessages) {
            capturedMessages.add(new TransactionalMessage(sender, message, timestamp));
            Log.i(TAG, "✅ Message added to queue! New size: " + capturedMessages.size());

            // Optional: Limit the size of the list
            // if (capturedMessages.size() > MAX_MESSAGES) {
            // capturedMessages.remove(0);
            // }
        }

        Log.i(TAG, "🚀 Message ready for React Native sync!");
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        super.onNotificationRemoved(sbn);
        Log.d(TAG, "🗑️ Notification removed from: " + sbn.getPackageName());
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "🚀 NotificationListener Service CREATED and ACTIVE!");
        Log.i(TAG, "🎯 Monitoring target apps: " + java.util.Arrays.toString(TARGET_APPS));
        Log.i(TAG, "🔍 Looking for keywords: " + java.util.Arrays.toString(TRANSACTIONAL_KEYWORDS));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.w(TAG, "💀 NotificationListener Service DESTROYED!");
        Log.i(TAG, "📊 Final message count: " + capturedMessages.size());
    }

    // Static method to retrieve messages (e.g., for React Native module to call)
    public static List<TransactionalMessage> getCapturedMessages() {
        synchronized (capturedMessages) {
            Log.i(TAG, "📋 React Native requesting " + capturedMessages.size() + " captured messages");
            // Return a copy to avoid concurrent modification issues if accessed from
            // multiple threads
            return new ArrayList<>(capturedMessages);
        }
    }

    public static void clearMessages() {
        synchronized (capturedMessages) {
            int clearedCount = capturedMessages.size();
            capturedMessages.clear();
            Log.i(TAG, "🧹 Cleared " + clearedCount + " captured messages from queue");
        }
    }
}