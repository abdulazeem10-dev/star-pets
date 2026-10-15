# Star Pets MERN application

The customer storefront is a React application in `client/`. The API and database layer are Express and Mongoose in `server.js` and `models.js`. The website and Android WebView app can use the same deployed website and API, so product, account, order, and grooming data stay in one MongoDB-backed service.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB connection string

## Run locally

1. Install packages: `npm install`
2. Create `.env` in the project root with `MONGO_URI`, `JWT_SECRET`, and any optional integration credentials used by `server.js`. For Razorpay test payments, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the Razorpay Test Mode dashboard. Never use Live Mode keys until you are ready to accept real payments.
3. Start the API in one terminal: `npm run dev:server`
4. Start the React dev server in another terminal: `npm run dev:client`
5. Open `http://localhost:5173`.

The Vite server proxies `/api`, `/images`, and `/css` to Express on port 3000. MongoDB must be reachable and configured before API-backed features can load or save data.

## Razorpay test payments

- Checkout uses Razorpay Standard Checkout. The server creates each payment order and verifies the payment signature and captured amount before marking a Star Pets order paid.
- Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as local environment variables in `.env` and as Vercel project environment variables. Use Test Mode keys for testing; do not put the secret in React/client files or share it in chat.
- Cash on delivery remains available. Online payment requires both Razorpay keys; until they are configured, select cash on delivery.
- Razorpay payment methods available to customers depend on the methods enabled for your Razorpay account. See the [Razorpay Standard Checkout integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).

## Product discounts and branding

- In the admin panel, add or edit a product and set its regular price and discount percentage (0–100). The storefront shows the discounted price and sale badge; the API calculates the same discounted price for checkout orders.
- The provided transparent Star Pets logo is served from `public/images/star-pets-logo-transparent.png` and used in the storefront, admin panel, and site icon.

## Build and serve the website

Run `npm run build:client`. This compiles React and copies the generated assets into `public/`, which Express serves. Deploy the project with its environment variables configured. The Android WebView should point at the public HTTPS URL for this same deployment.

Changing React UI requires a new website deployment; the Android app will show that update when it loads the shared URL. Changing native Android code requires a new Android build. The Android Studio project is in `android-app/`.

## Existing API features

The existing Express/Mongoose APIs cover products, account login/registration, checkout/orders, grooming requests, and the optional Vapi follow-up workflow. The React pages call those endpoints; this conversion retains the API and data models.

## Notes

- `public/admin.html` remains the existing admin interface.
- `client/scripts/deploy-build.js` updates the storefront HTML aliases while preserving the admin page.
- Do not commit `.env`, private API keys, or database credentials.
