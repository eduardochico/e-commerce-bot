# e-commerce-bot

This project provides a simple NestJS API to read the products catalog from a Shopify store. It now uses the `shopify-app-remix` module together with `@shopify/shopify-api` to access the Admin API. The API exposes a single endpoint that returns the list of products.

## Prerequisites

- Node.js 18 or later
- Shopify API access token

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set the following environment variables:

- `SHOPIFY_SHOP_DOMAIN` – your Shopify store domain (e.g. `my-shop.myshopify.com`)
- `SHOPIFY_API_KEY` – the API key for your Shopify app
- `SHOPIFY_API_SECRET` – the API secret key
- `SHOPIFY_APP_URL` – public URL where the app is hosted
- `SHOPIFY_ADMIN_API_ACCESS_TOKEN` – Admin API access token with permission to read products

You can create a `.env` file or export them in your shell before running the app.

## Building and running

Compile the TypeScript sources and start the server:

```bash
npm run build
npm start
```

The application listens on `http://localhost:3000` by default.

## Shopify configuration

The API is initialized using `shopify-app-remix` with in-memory session storage. It relies on the `@shopify/shopify-api` library under the hood.

## API Usage

### Get all products

```
GET /products
```

Example using `curl`:

```bash
curl http://localhost:3000/products
```

This will return the JSON payload from Shopify's [Products API](https://shopify.dev/docs/api/admin-rest/2023-10/resources/product). If Shopify credentials are missing or invalid, the API responds with an error message.
