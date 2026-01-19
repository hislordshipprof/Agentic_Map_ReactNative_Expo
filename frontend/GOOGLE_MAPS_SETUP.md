# Google Maps API Key Setup (Android)

## Why `npx expo credentials:manager` failed

- You ran it from the **project root**; the Expo app lives in `frontend/`, so `npx expo` was using the **global deprecated expo-cli** (Exponent-Client: 6.3.12).
- That old CLI calls `https://exp.host/--/api/v2/credentials/android`, which returns **404** because the API was removed.
- **Fix:** Run Expo commands from the `frontend/` folder so the local `expo` package is used. The `expo credentials` flow has also moved to **EAS** (`eas credentials`) for managed credentials.

## Get SHA-1 for Google Maps (Android)

Google requires your app’s **package name** and **SHA-1** to restrict the Maps API key.

### 1. Get your SHA-1

**Option A – npm script (from `frontend/`):**
```bash
npm run android:sha1
```

**Option B – keytool (Windows PowerShell):**
```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

In the output, use the line:
`SHA1: XX:XX:XX:...:XX`

**If `debug.keystore` is missing:** It was created when we ran the setup. If you ever remove it, run an Android build once (e.g. `npx expo run:android`) or recreate it with:

```powershell
keytool -genkey -v -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

### 2. Create / restrict the API key in Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create or select an **API key**.
3. Enable **Maps SDK for Android** (and any other Google APIs you need).
4. Under **Application restrictions** → **Android apps**:
   - Package: `com.agenticmap.mobile` (from `app.config.js`).
   - SHA-1: paste the value from step 1 (e.g. `B3:79:9E:87:B1:4E:B5:97:86:43:A6:5D:E2:F5:53:A9:24:38:FD:12`).

### 3. Put the key in the project (never commit it)

**Android** – the key is **not** in `AndroidManifest.xml`; it is injected at build time from:

- **`frontend/android/local.properties`** (gitignored). Add:
  ```
  GOOGLE_MAPS_API_KEY=your_actual_key_here
  ```
  See `frontend/android/local.properties.example`.

- Or set the env var when building:  
  `set GOOGLE_MAPS_API_KEY=your_key` (Windows) or `export GOOGLE_MAPS_API_KEY=your_key` (macOS/Linux), then `npx expo run:android`.

**iOS** – `app.config.js` reads `process.env.GOOGLE_MAPS_API_KEY` from **`frontend/.env`**. Ensure `frontend/.env` has `GOOGLE_MAPS_API_KEY=...` and is in `.gitignore`.

### 4. Rebuild

After changing the API key:

```bash
cd frontend
npx expo run:android
```

If you ran `expo prebuild --clean`, ensure `GOOGLE_MAPS_API_KEY` is in `android/local.properties` or in your environment before `npx expo run:android`.

---

## If a key was exposed in git

1. **Rotate and revoke** the exposed key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials): edit the key → regenerate, or create a new key and delete the old one.
2. Restrict the new key to your app (package + SHA-1) and add it to `frontend/android/local.properties` as `GOOGLE_MAPS_API_KEY=...`.
3. The project is now set up so the key is **never** committed: `AndroidManifest.xml` uses a placeholder; Gradle reads from `local.properties` or `GOOGLE_MAPS_API_KEY` env at build time.

---

## Your current debug SHA-1

Use this value in **Application restrictions → Android apps** for your API key (debug builds):

```
B3:79:9E:87:B1:4E:B5:97:86:43:A6:5D:E2:F5:53:A9:24:38:FD:12
```

- **Package name:** `com.agenticmap.mobile`

For **release / Play Store** builds, add the **Play App Signing** SHA-1 from **Google Play Console → Your app → Setup → App integrity** when you publish.

---

## Avoid the old global expo-cli

To prevent `npx expo` from using the deprecated global `expo-cli`:

```bash
npm uninstall -g expo-cli
```

Always run Expo from the `frontend/` directory:

```bash
cd frontend
npx expo start
npx expo run:android
# etc.
```
