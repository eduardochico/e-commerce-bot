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
- `TWILIO_ACCOUNT_SID` – your Twilio account SID
- `TWILIO_AUTH_TOKEN` – the auth token for your Twilio account
- `TWILIO_WHATSAPP_NUMBER` – the Twilio WhatsApp-enabled number to send messages from
- `OPENAI_API_KEY` – your OpenAI API key for GPT-4 access
- `REDIS_URL` – connection URL for Redis (defaults to `redis://localhost:6379`)


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

This endpoint returns the raw JSON payload from Shopify's [Products API](https://shopify.dev/docs/api/admin-rest/2024-04/resources/product). The response structure matches Shopify's format with a top-level `products` array. If Shopify credentials are missing or invalid, the API responds with an error message.

### Get a single product

```
GET /products/:id
```

Retrieve the raw product information for the given product ID directly from Shopify.

Example:

```bash
curl http://localhost:3000/products/<id>
```

### Get product image

```
GET /products/:id/image
```

Returns a JSON object with the first image URL of the specified product.

```bash
curl http://localhost:3000/products/<id>/image
```

### WhatsApp webhook

Twilio will send incoming WhatsApp messages to the `/whatsapp/webhook` endpoint.
The assistant first detects the user's intent and supports the following intents:
`store-information`, `list-products`, `view-product-detail` and `buy-product`.
OpenAI is used both for intent detection and for generating the reply.

```
POST /whatsapp/webhook
```

Configure this URL as your WhatsApp webhook in the Twilio Console.
When a product is mentioned, the bot attaches the product image instead of sharing its URL. The assistant receives product IDs, prices, vendors and image URLs so it can answer detailed catalog questions and provide a link to view the product in the store.
