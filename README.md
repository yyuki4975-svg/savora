# Savora

Multilingual recipes and food culture built with React, Next.js/Vinext and PostgreSQL.

## Frontend

Node.js 22.13 or later.

```sh
npm ci
npm run assets:restore
cp .env.example .env.local
npm run dev
```

Set the catalogue API URL in .env.local. Static photos and map data are restored from public-assets.json with SHA256 verification.

## Backend

```sh
cd server/node
npm ci
npm run build
```

Configure PostgreSQL with server/node/.env.example. Apply the versioned migrations in server/node/migrations before starting the API.

## Docker

```sh
docker build -f server/deploy/Dockerfile.frontend.next -t savora-web .
```

## Development

```sh
npm run typecheck:web
npm run build
```

The interface supports phones, tablets and desktop in English, Chinese, Japanese, French, Italian and Spanish. Source and media credits are in public/images.

https://cookwsavora.com/
