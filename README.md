# RealWorld Website

This repository contains the source code of the [RealWorld](https://realworld.io) website.

## Install

Install the npm dependencies with:

```sh
npm install
```

## Develop

### Prerequisites

- Make sure you have [Docker](https://www.docker.com/) installed as it is used to execute the MongoDB development database.
- Create a [GitHub OAuth App](https://github.com/settings/developers) with the following settings:
  - Homepage URL: `http://localhost:15541`
  - Authorization callback URL: `http://localhost:15541/oauth/callback`
- Create a [GitHub personal access token](https://github.com/settings/tokens) with no scopes selected.
- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`

### Running the website in development mode

Execute the following command while replacing the `"********"` with the information obtained above:

```sh
FRONTEND_URL=http://localhost:15541 \
  BACKEND_URL=http://localhost:15542 \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:15543/test \
  GITHUB_CLIENT_ID="********" \
  GITHUB_CLIENT_SECRET="********" \
  GITHUB_PERSONAL_ACCESS_TOKEN="********" \
  JWT_SECRET="********" \
  npm run start
```

The website should then be available at http://localhost:15541.

## Debug

### Client

Add the following entry in the local storage of your browser:

```
| Key   | Value     |
| ----- | --------- |
| debug | layr:* |
```

### Server

Add the following environment variables when starting the website:

```sh
DEBUG=layr:* DEBUG_DEPTH=10
```

## License

MIT
