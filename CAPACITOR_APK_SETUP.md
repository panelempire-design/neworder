# CyberVault — Android APK Setup (Capacitor)

This document describes converting the responsive React web app into a native Android APK using **Capacitor**. The web codebase stays the same — Capacitor wraps it in a native shell.

> Capacitor is recommended over React Native because the existing React SPA can be reused 1:1 without re-implementing screens.

---

## 1. Prerequisites

Install on your local machine (not in the cloud container):

- **Node.js 18+** and **Yarn**
- **Java JDK 17**
- **Android Studio** (with Android SDK + Build Tools + an emulator/AVD)
- **Gradle 8+** (Android Studio bundles this)

Set environment variable `ANDROID_SDK_ROOT` to the SDK path (Android Studio shows this in *Settings → Languages & Frameworks → Android SDK*).

---

## 2. Install Capacitor

From `/app/frontend`:

```bash
cd frontend
yarn add @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar
```

The `capacitor.config.json` at the repo root contains the app metadata (`io.cybervault.app`, `CyberVault`). Copy it into `/app/frontend/` before initialization:

```bash
cp ../capacitor.config.json ./
```

---

## 3. Build the React app

The web app must be built to static assets (Capacitor wraps the `build/` folder):

```bash
yarn build      # outputs /app/frontend/build
```

> Important: the React app calls the API via `REACT_APP_BACKEND_URL`. Before building for production, set this to the public HTTPS endpoint of your FastAPI backend (e.g. `https://api.cybervault.io`). HTTP localhost will not work on a real Android device.

---

## 4. Add the Android platform

```bash
npx cap add android
npx cap sync android
```

This creates `/app/frontend/android/` with a fully configured Android Studio project.

---

## 5. Configure HTTPS & CORS for mobile

The FastAPI backend must:

1. Be served over **HTTPS** (Android blocks plain HTTP by default).
2. Allow the Capacitor app origin in CORS. Add to backend `.env`:

```
FRONTEND_URL=https://account-vault-41.preview.emergentagent.com,https://localhost,capacitor://localhost
```

Then update `server.py` to split on commas for `allow_origins`:

```python
allow_origins=os.environ["FRONTEND_URL"].split(",")
```

3. Cookies must be `secure=True`, `samesite="none"` (already configured in `auth_utils.py`).

---

## 6. Open in Android Studio & build the APK

```bash
npx cap open android
```

In Android Studio:

1. Wait for Gradle sync to finish.
2. Build → **Build Bundle(s) / APK(s) → Build APK(s)**.
3. The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

To produce a release-signed APK:

```bash
cd android
./gradlew assembleRelease    # unsigned
# then sign with apksigner using your keystore
```

---

## 7. Live test

- Plug an Android phone in (USB-debug ON) **or** start an emulator from Android Studio.
- Click ▶ in Android Studio → CyberVault launches.
- Auth, escrow, chat, reviews, admin — all work because they share the same HTTPS API.

---

## 8. App icons & splash

Generate adaptive icons using:

```bash
yarn add -D @capacitor/assets
npx capacitor-assets generate --android --iconBackgroundColor "#050508"
```

Place a 1024×1024 PNG (logo + neon glow) at `/app/frontend/assets/icon.png` first.

---

## 9. Re-sync after web changes

Whenever the React app changes:

```bash
cd /app/frontend
yarn build && npx cap sync android
```

---

## 10. Optional — React Native path

If you later want a fully native UI (not just a WebView wrapper):

- Rebuild the UI with React Native or Expo, reusing the FastAPI backend.
- All API endpoints, JWT auth, escrow logic, and database remain untouched.
- Estimated effort: ~2–3 weeks for one engineer.

For MVP, **Capacitor is the recommended path**.

---

## Quick command summary

```bash
# one time
yarn add @capacitor/core @capacitor/cli @capacitor/android
npx cap add android

# every release
yarn build && npx cap sync android && npx cap open android
```

Done — you now have a real Android APK of the CyberVault marketplace.
