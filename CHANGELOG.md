# Changelog

## v1.0.1 - Login Notification Prompt

- Shows **Ativar notificações** on the login screen when the app is already installed as a PWA.
- Allows notification permission before login.
- Stores the FCM token locally and links it to the student profile after login.

## v1.0.0 - PWA Notifications

- Added PWA notification activation flow for Android and iPhone.
- Added Firebase Cloud Messaging token storage in `fcmToken` and `fcmTokens`.
- Updated the service worker to handle background notifications.
- Updated the notification workflow to support manual dispatch from GitHub Actions.
- Changed notification links to open the app with `?post=<id>` so reads can be tracked.
- Added project documentation in `README.md` and `NOTIFICATIONS.md`.
- Added stable PWA `id` in `manifest.json`.
