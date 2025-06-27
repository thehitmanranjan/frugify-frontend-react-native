package com.thehitmanranjan.frugify;

import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import java.util.List;
import java.util.Set;

public class NotificationModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    NotificationModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    // Method to get messages for UI display (e.g., only unprocessed, limited count)
    @ReactMethod
    public void getMessagesForDisplay(Promise promise) {
        try {
            List<TransactionalMessage> messages = NotificationListener.getUnprocessedMessagesForDisplay(reactContext);
            WritableArray array = convertMessagesToWritableArray(messages);
            promise.resolve(array);
        } catch (Exception e) {
            promise.reject("ERR_GET_DISPLAY_MESSAGES", "Failed to get messages for display", e);
        }
    }

    // Method to get all unprocessed messages for backend processing
    @ReactMethod
    public void getUnprocessedMessagesForBackend(Promise promise) {
        try {
            List<TransactionalMessage> messages = NotificationListener.getUnprocessedMessagesForBackend(reactContext);
            WritableArray array = convertMessagesToWritableArray(messages);
            promise.resolve(array);
        } catch (Exception e) {
            promise.reject("ERR_GET_BACKEND_MESSAGES", "Failed to get messages for backend", e);
        }
    }

    @ReactMethod
    public void markMessageAsProcessing(String messageId, Promise promise) {
        try {
            NotificationListener.markMessageAsProcessing(reactContext, messageId);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_MARK_PROCESSING", "Failed to mark message as processing", e);
        }
    }

    @ReactMethod
    public void deleteProcessedMessage(String messageId, Promise promise) {
        try {
            NotificationListener.deleteMessage(reactContext, messageId);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_DELETE_MESSAGE", "Failed to delete message", e);
        }
    }

    // Helper function to convert List<TransactionalMessage> to WritableArray
    private WritableArray convertMessagesToWritableArray(List<TransactionalMessage> messages) {
        WritableArray array = new WritableNativeArray();
        for (TransactionalMessage msg : messages) {
            WritableMap map = new WritableNativeMap();
            map.putString("id", msg.id);
            map.putString("sender", msg.sender);
            map.putString("message", msg.message);
            map.putDouble("timestamp", msg.timestamp);
            map.putString("status", msg.status);
            array.pushMap(map);
        }
        return array;
    }

    // Keep existing permission methods
    @ReactMethod
    public void isNotificationListenerEnabled(Promise promise) {
        Set<String> enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(reactContext);
        String packageName = reactContext.getPackageName();
        promise.resolve(enabledListeners.contains(packageName));
    }

    @ReactMethod
    public void requestNotificationListenerPermission() {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }
}
