# Deploying GrainWatch For Base

Base does not host Node.js servers directly. This app should be deployed as a normal HTTPS Express app, then registered with Base so it can be opened from the Coinbase/Base ecosystem.

## 1. Deploy the app

Use any Node-capable host that gives you HTTPS and a public URL. For your current setup, Vercel is a good fit because this repo now exports the Express app cleanly for Vercel while still supporting local `app.listen(...)`.

Required runtime commands:

```bash
npm install
npm run build
npm start
```

The app serves the Express server from `server.js`. On Vercel, the `build` step compiles the Tailwind CSS and the Express app is bundled as a single Vercel Function.

## 2. Set environment variables

At minimum, configure these values in your host:

```env
PORT=3000
PSA_PXWEB_BASE=https://openstat.psa.gov.ph/PXWeb/api/v1/en
PSA_RETAIL_TABLE=DB/DB__2M__2018NEW/0042M4ARN01.px
PSA_FARMGATE_TABLE=DB/DB__2M__NFG/0032M4AFN01.px
BASE_NETWORK=sepolia
BASE_ATTESTATION_CONTRACT=
```

Optional Base overrides:

```env
BASE_RPC_URL=
BASE_EXPLORER_URL=
BASE_WALLET_INSTALL_URL=https://www.coinbase.com/wallet
PUBLIC_APP_URL=
```

Use `BASE_NETWORK=mainnet` when you are ready to point the wallet flow at Base Mainnet instead of Base Sepolia.

## 3. If you need the pre-April 9, 2026 Mini App flow

This repo now serves the Base/Farcaster manifest at:

```text
/.well-known/farcaster.json
```

To sign it:

1. Deploy the app to production first.
2. Open Base.dev.
3. Go to Preview -> Account Association.
4. Enter your production app URL.
5. Copy the generated `accountAssociation` object.
6. Set these env vars in Vercel and redeploy:

```env
BASE_FARCASTER_HEADER=
BASE_FARCASTER_PAYLOAD=
BASE_FARCASTER_SIGNATURE=
BASE_BUILDER_OWNER_ADDRESS=
BASE_MINIAPP_CATEGORY=finance
BASE_MINIAPP_TAGS=grainwatch,agriculture,markets,base
BASE_WEBHOOK_URL=
```

## 4. Register the deployed URL with Base

After the site is live:

1. Open Base.dev.
2. Create a project for the app.
3. Set the primary URL to your deployed HTTPS domain.
4. Fill in the app metadata, icon, screenshots, description, and category.

## 5. Verify the live app

Check these routes after deployment:

```text
/health
/markets
/oracle
/api/v1/base/config
```

Inside the live app, confirm that:

1. The wallet button detects Coinbase Wallet or the Base App browser.
2. The app can switch to the configured Base network.
3. Typed-data signing works on the Oracle page.
4. Publishing is enabled after `BASE_ATTESTATION_CONTRACT` is set.
