# Running ARIA on Your iPhone

## Option 1 — Expo Go (fastest, no build needed)

1. Install **Expo Go** from the App Store on your iPhone
2. On your computer, install Node.js and run:
   ```bash
   cd virtual-assistant/ios-app
   npm install
   npx expo start
   ```
3. A QR code appears in the terminal
4. Open the **Camera** app on your iPhone and scan the QR code
5. Tap the notification — ARIA opens in Expo Go

> The backend must be running on the same Wi-Fi network.
> In the app's Laptop tab, set the Server URL to your computer's local IP.

---

## Option 2 — EAS Build (standalone .ipa, no App Store needed)

Install via TestFlight or direct install using a free Apple Developer account.

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo (free account)
eas login

# Build for iOS (cloud build — no Mac needed)
cd virtual-assistant/ios-app
eas build --platform ios --profile preview
```

EAS will:
1. Build in the cloud
2. Send you a download link
3. You install via TestFlight or direct .ipa sideload

---

## Option 3 — Xcode (local build, Mac required)

```bash
cd virtual-assistant/ios-app
npm install
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios --device
```

---

## Configure the Server URL

After opening the app:
1. Go to the **Laptop** tab
2. Tap the Server URL field
3. Enter `http://<your-computer-ip>:8000`
4. Make sure the backend is running: `cd backend && python main.py`

Find your computer's IP:
- Mac/Linux: `ifconfig | grep "inet 192"`
- Windows: `ipconfig`

---

## Permissions Required

The app will ask for:
- **Microphone** — for voice commands ("Hey ARIA", hold-to-speak)
- **Local Network** — to connect to your laptop agent

These are only used locally and never shared.
