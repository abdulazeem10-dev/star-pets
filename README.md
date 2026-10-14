# Star Pets MERN application

The customer storefront is a React application in `client/`. The API and database layer are Express and Mongoose in `server.js` and `models.js`. The Android experience is an installable Progressive Web App (PWA): it uses the same React website and API, so there is no separate Java app to maintain and web changes appear in the installed app after deployment.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB connection string

## Run locally

1. Install packages: `npm install`
2. Create `.env` in the project root with `MONGO_URI`, `JWT_SECRET`, and any optional integration credentials used by `server.js`.
3. Start the API in one terminal: `npm run dev:server`
4. Start the React dev server in another terminal: `npm run dev:client`
5. Open `http://localhost:5173`.

The Vite server proxies `/api`, `/images`, and `/css` to Express on port 3000. MongoDB must be reachable and configured before API-backed features can load or save data.

## Build and serve the website

Run `npm run build:client`. This compiles React and copies the generated assets into `public/`, which Express serves. Deploy the project with its environment variables configured. The site includes a PWA manifest and service worker and must be served over HTTPS (the Vercel production URL already uses HTTPS).

To install the app on Android, deploy the site, open `https://star-pets-six.vercel.app/` in Chrome on the phone, open the three-dot menu, and select **Install app** (or **Add to Home screen**). It opens in app-style standalone mode and loads the same live React site. After you deploy changes, reopen the app while online to load the updated site. Android Studio and the optional legacy `android-app/` Java WebView wrapper are not needed for this PWA.

## Existing API features

The existing Express/Mongoose APIs cover products, account login/registration, checkout/orders, grooming requests, and the optional Vapi follow-up workflow. The React pages call those endpoints; this conversion retains the API and data models.

## Notes

- `public/admin.html` remains the existing admin interface.
- `client/scripts/deploy-build.js` updates the storefront HTML aliases while preserving the admin page.
- Do not commit `.env`, private API keys, or database credentials.
