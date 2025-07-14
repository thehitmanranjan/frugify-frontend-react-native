package com.thehitmanranjan.frugify;

import android.content.Intent;
import android.provider.Settings;
import android.util.Log;
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
    private static final String TAG = "NotificationModule";
    private static ReactApplicationContext reactContext;

    NotificationModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        Log.i(TAG, "🔧 NotificationModule initialized");
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    @ReactMethod
    public void getTransactionalMessages(Promise promise) {
        try {
            Log.i(TAG, "📱 React Native requesting transactional messages...");
            List<TransactionalMessage> messages = NotificationListener.getCapturedMessages();
            Log.i(TAG, "📊 Found " + messages.size() + " messages to return to React Native");

            WritableArray array = new WritableNativeArray();
            for (TransactionalMessage msg : messages) {
                WritableMap map = new WritableNativeMap();
                map.putString("sender", msg.sender);
                map.putString("message", msg.message);
                map.putDouble("timestamp", msg.timestamp); // Timestamps are long, use double for JS
                array.pushMap(map);

                Log.d(TAG, "   📝 Message: " + msg.sender + " - " + msg.message);
            }

            Log.i(TAG, "✅ Successfully returning " + messages.size() + " messages to React Native");
            promise.resolve(array);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error getting transactional messages: " + e.getMessage(), e);
            promise.reject("ERR_UNEXPECTED_EXCEPTION", e);
        }
    }

    @ReactMethod
    public void clearTransactionalMessages(Promise promise) {
        try {
            Log.i(TAG, "🧹 React Native requesting to clear all messages...");
            NotificationListener.clearMessages();
            Log.i(TAG, "✅ Successfully cleared all messages");
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error clearing messages: " + e.getMessage(), e);
            promise.reject("ERR_UNEXPECTED_EXCEPTION", e);
        }
    }

    @ReactMethod
    public void isNotificationListenerEnabled(Promise promise) {
        try {
            Log.i(TAG, "🔍 Checking if NotificationListener is enabled...");
            Set<String> enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(reactContext);
            String packageName = reactContext.getPackageName();
            boolean isEnabled = enabledListeners.contains(packageName);

            Log.i(TAG, "📦 Package: " + packageName + ", Enabled: " + isEnabled);
            Log.i(TAG, "🔧 All enabled listeners: " + enabledListeners.toString());

            promise.resolve(isEnabled);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error checking notification listener status: " + e.getMessage(), e);
            promise.reject("ERR_UNEXPECTED_EXCEPTION", e);
        }
    }

    @ReactMethod
    public void requestNotificationListenerPermission() {
        try {
            Log.i(TAG, "🔓 React Native requesting notification listener permission...");
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            Log.i(TAG, "✅ Successfully launched notification listener settings");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error launching notification settings: " + e.getMessage(), e);
        }
    }
}
