# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo
-keep class expo.** { *; }
-keep class com.expo.** { *; }

# Supabase and JWT
-keep class com.supabase.** { *; }
-keep class io.jsonwebtoken.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Navigation
-keep class com.reactnavigation.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# React Native Paper
-keep class com.callstack.** { *; }

# Chart Kit and SVG
-keep class com.horcrux.svg.** { *; }

# Axios and networking
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Serialization classes
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Keep native methods
-keepclasseswithmembers class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Add any project specific keep options here:
