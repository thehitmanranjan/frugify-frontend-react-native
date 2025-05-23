import React, { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthRequestConfig } from 'expo-auth-session'; // Import AuthRequestConfig for explicit typing
import * as Google from 'expo-auth-session/providers/google';
import { Button, View, Text, StyleSheet, Image } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
}

const Auth = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const expoClientIdFromConst = Constants.expoConfig?.extra?.expoClientId as string | undefined;
  const webClientIdFromConst = Constants.expoConfig?.extra?.webClientId as string | undefined;
  const iosClientIdFromConst = Constants.expoConfig?.extra?.iosClientId as string | undefined;
  const androidClientIdFromConst = Constants.expoConfig?.extra?.androidClientId as string | undefined;

  const effectiveExpoClientId = expoClientIdFromConst;
  const effectiveWebClientId = webClientIdFromConst || effectiveExpoClientId;
  const effectiveIosClientId = iosClientIdFromConst || effectiveExpoClientId;
  const effectiveAndroidClientId = androidClientIdFromConst || effectiveExpoClientId;

  if (!effectiveExpoClientId) {
    console.error("Client ID (expoClientId) is not configured. Check app.json (expo.extra.expoClientId).");
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Client ID (expoClientId) is not configured.</Text>
        <Text>Please ensure expo.extra.expoClientId is set in app.json.</Text>
      </View>
    );
  }

  const redirectUri = makeRedirectUri({
    scheme: Array.isArray(Constants.expoConfig?.scheme)
      ? Constants.expoConfig?.scheme[0]
      : Constants.expoConfig?.scheme ?? 'my-app',
    preferLocalhost: true,
  });

  // Explicitly define the type for the config object
  // Attempting to fix TS2322 by changing scopes to a space-separated string
  const authRequestConfig: AuthRequestConfig = {
    clientId: effectiveExpoClientId,
    scopes: ['profile', 'email'], // Changed to array of strings as required by type
    redirectUri,
  };

  const [request, response, promptAsync] = Google.useAuthRequest(authRequestConfig);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication) {
        setAccessToken(authentication.accessToken);
        getUserInfo(authentication.accessToken);
      }
    }
  }, [response]);

  const getUserInfo = async (token: string) => {
    if (!token) {
      console.log("No token available, cannot fetch user info.");
      setUserInfo(null);
      return;
    }
    try {
      const apiResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('Failed to fetch user info:', apiResponse.status, errorText);
        setUserInfo(null);
        setAccessToken(null);
        return;
      }
      const user = await apiResponse.json() as UserInfo;
      console.log("User info fetched: ", user);
      setUserInfo(user);
    } catch (error) {
      console.error('Error fetching user info:', error);
      setUserInfo(null);
      setAccessToken(null);
    }
  };

  const handleSignOut = async () => {
    if (accessToken) {
      try {
        // Manual token revocation
        const revokeResponse = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        if (revokeResponse.ok) {
          console.log("Token revoked successfully via manual fetch.");
        } else {
          const errorText = await revokeResponse.text();
          console.error("Failed to revoke token manually:", revokeResponse.status, errorText);
        }
      } catch (e) {
        console.error("Error during manual token revocation: ", e);
      }
    }
    setUserInfo(null);
    setAccessToken(null);
    console.log("User signed out.");
  };

  return (
    <View style={styles.container}>
      {userInfo ? (
        <View style={styles.userInfoContainer}>
          {userInfo.picture && <Image source={{ uri: userInfo.picture }} style={styles.profilePic} />}
          <Text style={styles.welcomeText}>Welcome, {userInfo.name || userInfo.email}!</Text>
          {userInfo.email && <Text>Email: {userInfo.email}</Text>}
          <Button title="Sign Out" onPress={handleSignOut} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Sign In</Text>
          <Button
            disabled={!request}
            title="Sign in with Google"
            onPress={() => {
              promptAsync();
            }}
          />
          {!request && <Text style={styles.loadingText}>Loading authentication request...</Text>}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontStyle: 'italic',
  }
});

export default Auth;
