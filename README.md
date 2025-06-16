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

Twilio will send incoming WhatsApp messages to the `/whatsapp/webhook` endpoint. If the user sends a message containing the word `"products"`, the bot replies with the list of available product names from Shopify.

```
POST /whatsapp/webhook
```

Configure this URL as your WhatsApp webhook in the Twilio Console.
If a message contains a product name or ID, the bot attaches that product's image in the reply. The assistant also receives product IDs, prices, vendors, and image URLs so it can answer detailed catalog questions.
