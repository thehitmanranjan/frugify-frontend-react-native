# Running the Application: ExpoGo vs Expo Dev Client

This guide explains how to run the application using either **ExpoGo** or the **Expo Dev Client**.

---

## 1. Using ExpoGo (Recommended for Personal Laptops)

### Steps:

1. Run the app:

   ```bash
   npm run start
   ```

2. This will start the project in **ExpoGo mode** by default.

3. If it starts in **Development Build mode**:
   - Press **`S`** in the terminal to switch to **ExpoGo mode**.

4. Scan the QR code using the **ExpoGo app** on your mobile device.

---

## 2. Using Expo Dev Client (Recommended for Company Laptops)

Due to network restrictions on company laptops, **ExpoGo might not work**. In such cases, use the **Expo Dev Client** method.

### Steps:

1. **Create `eas.json` file:**
   - Use the official Expo CLI commands to generate the file.
   - Example structure:

     ```json
     {
       "build": {
         "development": {
           "developmentClient": true,
           "distribution": "internal"
         }
       }
     }
     ```

2. **Update `app.json`:**
   - Add your **EAS project ID** and any other required configuration fields.
   - The project ID can be found in the EAS dashboard or from CLI output.

3. **Build the Development APK:**

   ```bash
   eas build --profile development --platform android
   ```

4. **Download and Install the APK:**
   - Once the build completes, download the APK from the EAS dashboard.
   - Install it on your device using a method like:

     ```bash
     adb install path/to/your.apk
     ```

5. **Start the Development Server:**

   ```bash
   npm run start
   ```

   or

   ```bash
   npm run start -- --dev-client
   ```

6. **Important Notes:**
   - This will launch the project using the installed **Dev Client APK**.
   - If you make **native module changes**, you **must rebuild** and **reinstall** the APK.
   - For **JavaScript-only changes**, you do **not** need to rebuild the APK.

---

## Summary

| Method         | Recommended For       | Notes                                                                 |
|----------------|-----------------------|-----------------------------------------------------------------------|
| **ExpoGo**     | Personal laptops      | Fast and simple; works over same Wi-Fi network                        |
| **Dev Client** | Company laptops       | Requires custom build; works even with network restrictions           |
