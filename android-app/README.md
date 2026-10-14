# Star Pets Android app

This is a small Android app shell that displays the Star Pets website inside Android WebView. The shop, account screens, grooming requests, and API continue to use the existing website and Express/MongoDB backend.

## Keep the app connected to the live site

The WebView opens the public production URL `https://star-pets-six.vercel.app/`, configured as `starPetsUrl` in `gradle.properties`. This is the production domain shown in Vercel. Open it in a private/incognito browser window to confirm it serves the store publicly before building the Android app.

After the Android app is installed, changes appear there after the website is deployed to that same URL. App content needs an internet connection. The Android package does not copy the website files or duplicate its database/API.

## Open and build

1. Install Android Studio and its Android SDK Platform 36. Use the Android Studio bundled JDK 17.
2. Open this `android-app` folder in Android Studio and wait for Gradle sync.
3. The production URL is already set in `gradle.properties`; if the Vercel domain changes, update `starPetsUrl` and sync again.
4. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to create a test APK. The generated debug APK is under `app/build/outputs/apk/debug/`.
5. For Google Play, use **Build > Generate Signed Bundle / APK** and create a signed Android App Bundle (AAB).

The project targets API 36, uses HTTPS only, keeps web storage enabled for the shop's cart and login session, handles Android back navigation, opens outside links in the browser, and supports file selection from web forms.

## Project identifiers

- App name: Star Pets
- Application ID: `com.starpets.mobile`
- Minimum Android: API 23
- Target Android: API 36

For Google sign-in through a WebView, verify the Google Identity Services configuration with the production domain. Email/password login continues to use the existing site API.
