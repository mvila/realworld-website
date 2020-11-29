# RealWorld Website

This repository contains the source code of the [RealWorld](https://realworld.io) website.

## Install

Install the npm dependencies with:

```sh
npm install
```

Make sure you have [Docker](https://www.docker.com/) installed as it is used to execute the MongoDB database when running the website in development mode.

## Develop

### Running the website in development mode

Execute the following command:

```sh
FRONTEND_URL=http://localhost:15541 \
  BACKEND_URL=http://localhost:15542 \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:15543/test \
  GITHUB_CLIENT_ID=******** \
  GITHUB_CLIENT_SECRET=******** \
  GITHUB_PERSONAL_ACCESS_TOKEN=******** \
  JWT_SECRET=******** \
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
