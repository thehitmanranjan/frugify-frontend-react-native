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

    @ReactMethod
    public void getTransactionalMessages(Promise promise) {
        try {
            List<TransactionalMessage> messages = NotificationListener.getCapturedMessages();
            WritableArray array = new WritableNativeArray();
            for (TransactionalMessage msg : messages) {
                WritableMap map = new WritableNativeMap();
                map.putString("sender", msg.sender);
                map.putString("message", msg.message);
                map.putDouble("timestamp", msg.timestamp); // Timestamps are long, use double for JS
                array.pushMap(map);
            }
            promise.resolve(array);
        } catch (Exception e) {
            promise.reject("ERR_UNEXPECTED_EXCEPTION", e);
        }
    }

    @ReactMethod
    public void clearTransactionalMessages(Promise promise) {
        try {
            NotificationListener.clearMessages();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_UNEXPECTED_EXCEPTION", e);
        }
    }

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
