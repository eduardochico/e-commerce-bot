# e-commerce-bot

This project provides a simple NestJS API to read the products catalog from a Shopify store. The API exposes a single endpoint that proxies requests to Shopify and returns the list of products.

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
- `SHOPIFY_ACCESS_TOKEN` – a private app access token with permissions to read products


You can create a `.env` file or export them in your shell before running the app.

## Building and running

Compile the TypeScript sources and start the server:

```bash
npm run build
npm start
```

The application listens on `http://localhost:3000` by default.


## API Usage

### Get all products

```
GET /products
```

Example using `curl`:

```bash
curl http://localhost:3000/products
```

This endpoint returns a simplified JSON payload derived from Shopify's [Products API](https://shopify.dev/docs/api/admin-rest/2024-04/resources/product). Each product object contains the fields `productName`, `productId`, `imageUrl`, `price`, and `vendor`. If Shopify credentials are missing or invalid, the API responds with an error message.
