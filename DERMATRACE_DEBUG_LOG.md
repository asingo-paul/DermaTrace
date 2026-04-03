# DermaTrace — Debug Log & Adjustments Reference

## 1. Python / Backend Issues

### bcrypt + passlib incompatibility
**Error:** `ValueError: password cannot be longer than 72 bytes` / `AttributeError: module 'bcrypt' has no attribute '__about__'`
**Cause:** `bcrypt` v4.x dropped the `__about__` attribute that `passlib` expects.
**Fix:**
```bash
pip install "bcrypt==4.0.1" "passlib[bcrypt]==1.7.4"
```

---

### `setuptools.backends.legacy` not found
**Error:** `BackendUnavailable: Cannot import 'setuptools.backends.legacy'`
**Cause:** Wrong build backend in `pyproject.toml`.
**Fix:** Change `pyproject.toml`:
```toml
[build-system]
build-backend = "setuptools.build_meta"   # NOT setuptools.backends.legacy:build
```

---

### `No module named 'app'` when running Alembic
**Error:** `ModuleNotFoundError: No module named 'app'`
**Cause:** Python path doesn't include the `backend/` directory.
**Fix:** Always run Alembic with PYTHONPATH set:
```bash
export PYTHONPATH=$PWD
alembic upgrade head
```

---

### SQLAlchemy async driver error
**Error:** `The asyncio extension requires an async driver. The loaded 'psycopg2' is not async.`
**Cause:** `DATABASE_URL` uses `postgresql://` instead of `postgresql+asyncpg://`.
**Fix:** Update `.env`:
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
```

---

### Supabase connection timeout / Network unreachable
**Error:** `OSError: [Errno 101] Network is unreachable`
**Cause:** Direct Supabase DB port 5432 may be blocked on some networks.
**Fix:** Use the Supabase **connection pooler** URL (port 6543):
```
DATABASE_URL=postgresql+asyncpg://postgres.PROJECTREF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
```
Found in: Supabase Dashboard → Settings → Database → Connection Pooling → Transaction mode.

---

### `@lru_cache` caching old DATABASE_URL
**Error:** Alembic uses old URL even after `.env` update.
**Cause:** `get_settings()` is cached — reads `.env` once and never re-reads.
**Fix:** Override with environment variable directly:
```bash
export DATABASE_URL="postgresql+asyncpg://..."
alembic upgrade head
```

---

### M-Pesa OAuth 400 Bad Request
**Error:** `Client error '400 Bad Request' for url '.../oauth/v1/generate?grant_type=client_credentials'`
**Cause 1:** `httpx` auth tuple doesn't match Safaricom's expected Basic Auth format.
**Fix:** Use explicit Base64 encoded header:
```python
import base64
credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
headers = {"Authorization": f"Basic {credentials}"}
```
**Cause 2:** `.env` had `security credentials=` (space in key name) which corrupted env parsing.
**Fix:** Rename to `security_credentials=` (underscore, no spaces in env key names).

---

### M-Pesa Invalid Callback URL
**Error:** `Bad Request: Invalid CallBackURL`
**Cause:** Safaricom requires a publicly accessible HTTPS URL. `localhost` and plain HTTP are rejected.
**Fix (development):** Use ngrok to expose local backend:
```bash
ngrok http 8000
# Copy the https://xxx.ngrok-free.app URL
```
Then update `.env`:
```
APP_BASE_URL=https://xxx.ngrok-free.app
```
**Fix (production):** Deploy backend to Railway/Render and use the deployment URL.

---

## 2. React Native / Mobile Issues

### `Unable to load script` on physical device
**Root cause:** The app cannot reach the Metro bundler.
**Fix options:**
1. Run `adb reverse tcp:8081 tcp:8081` before launching the app
2. Bundle JS into the APK (no Metro needed):
```bash
npx react-native bundle \
  --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
npx react-native run-android
```

---

### Metro `Cannot read properties of undefined (reading 'handle')`
**Cause:** Version mismatch between `metro` and `connect` package with Node 24.
**Fix:** Start Metro directly (bypasses the broken CLI wrapper):
```bash
node node_modules/metro/src/cli.js serve --config metro.config.js --port 8081
```

---

### `No Metro config found`
**Fix:** Create `mobile/metro.config.js`:
```js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
module.exports = mergeConfig(getDefaultConfig(__dirname), {});
```

---

### `Cannot find module 'axios'`
**Fix:**
```bash
cd mobile && npm install axios
```

---

### `Cannot find module '@babel/plugin-proposal-decorators'`
**Fix:** Simplify `babel.config.js` — WatermelonDB decorators not needed for current code:
```js
module.exports = { presets: ['@react-native/babel-preset'] };
```

---

### `BuildConfig` unresolved in `MainApplication.kt`
**Cause:** Kotlin files were in `com.dermatracetemp` package but `build.gradle` namespace was `com.dermatrace`.
**Fix:** Move files to correct package directory:
- `android/app/src/main/java/com/dermatrace/MainActivity.kt`
- `android/app/src/main/java/com/dermatrace/MainApplication.kt`
- Update `package com.dermatracetemp` → `package com.dermatrace` in both files
- Update `getMainComponentName()` to return `"DermaTrace"` (must match `app.json` name)

---

### NDK download hanging for hours
**Cause:** Gradle auto-downloads NDK over slow/blocked network.
**Fix:** Download NDK manually from browser:
```
https://dl.google.com/android/repository/android-ndk-r26b-linux.zip
```
Extract to:
```bash
mkdir -p ~/Android/Sdk/ndk/26.1.10909125
unzip android-ndk-r26b-linux.zip -d /tmp/ndk
cp -r /tmp/ndk/android-ndk-r26b/* ~/Android/Sdk/ndk/26.1.10909125/
```

---

### `adb: not found`
**Fix:** Add to `~/.bashrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
source ~/.bashrc
```

---

### Java 17 not found (Gradle)
**Cause:** System has Java 21, `gradle.properties` pointed to Java 17.
**Fix:** Update `mobile/android/gradle.properties`:
```
org.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64
```

---

### `@react-native/gradle-plugin` not found
**Cause:** Yarn workspaces in root `package.json` hoisted all packages to root `node_modules`, but Gradle looks in `mobile/node_modules`.
**Fix:** Remove `workspaces` from root `package.json`, then reinstall inside `mobile/`:
```bash
cd mobile && npm install
```

---

### App API URL — physical device can't reach `localhost`
**Cause:** `localhost` on the phone refers to the phone itself, not the computer.
**Fix:** Use the computer's local IP in `mobile/src/lib/api.ts`:
```ts
const API_URL = process.env.API_URL ?? 'http://192.168.1.103:8000';
```
Check current IP: `hostname -I | awk '{print $1}'`
**Note:** IP changes when WiFi network changes — update and rebundle when needed.

---

## 3. Environment Variables Reference

### backend/.env required keys
```
DATABASE_URL=postgresql+asyncpg://...pooler.supabase.com:6543/postgres
JWT_SECRET=<long random string>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
MPESA_CONSUMER_KEY=<from Safaricom developer portal>
MPESA_CONSUMER_SECRET=<from Safaricom developer portal>
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
APP_BASE_URL=https://your-ngrok-or-railway-url.app
AIRTEL_CLIENT_ID=<from Airtel developer portal>
AIRTEL_CLIENT_SECRET=<from Airtel developer portal>
```

### .env rules
- No spaces in key names (`security_credentials=` not `security credentials=`)
- No quotes needed around values unless they contain spaces
- Never commit `.env` to git — it's in `.gitignore`

---

## 4. Development Workflow

### Start backend
```bash
cd ~/DermaTrace/backend
source venv/bin/activate
export PYTHONPATH=$PWD
export DATABASE_URL="postgresql+asyncpg://..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Run Alembic migrations
```bash
export PYTHONPATH=$PWD
export DATABASE_URL="postgresql+asyncpg://..."
alembic upgrade head
```

### Start ngrok (for M-Pesa testing)
```bash
ngrok http 8000
# Update APP_BASE_URL in .env with the https URL
```

### Bundle and deploy mobile app
```bash
cd ~/DermaTrace/mobile
npx react-native bundle \
  --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
npx react-native run-android
```

### When WiFi IP changes
```bash
hostname -I | awk '{print $1}'
# Update mobile/src/lib/api.ts fallback URL
# Rebundle and reinstall
```
