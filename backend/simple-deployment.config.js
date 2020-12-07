module.exports = () => {
  const frontendURL = process.env.FRONTEND_URL;

  if (!frontendURL) {
    throw new Error(`'FRONTEND_URL' environment variable is missing`);
  }

  const backendURL = process.env.BACKEND_URL;

  if (!backendURL) {
    throw new Error(`'BACKEND_URL' environment variable is missing`);
  }

  const domainName = new URL(backendURL).hostname;

  const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
  }

  const githubClientId = process.env.GITHUB_CLIENT_ID;

  if (!githubClientId) {
    throw new Error(`'GITHUB_CLIENT_ID' environment variable is missing`);
  }

  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!githubClientSecret) {
    throw new Error(`'GITHUB_CLIENT_SECRET' environment variable is missing`);
  }

  const githubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  if (!githubPersonalAccessToken) {
    throw new Error(`'GITHUB_PERSONAL_ACCESS_TOKEN' environment variable is missing`);
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(`'JWT_SECRET' environment variable is missing`);
  }

  return {
    type: 'function',
    provider: 'aws',
    domainName,
    files: ['./build'],
    main: './build/handler.js',
    includeDependencies: true,
    environment: {
      FRONTEND_URL: frontendURL,
      BACKEND_URL: backendURL,
      MONGODB_STORE_CONNECTION_STRING: connectionString,
      GITHUB_CLIENT_ID: githubClientId,
      GITHUB_CLIENT_SECRET: githubClientSecret,
      GITHUB_PERSONAL_ACCESS_TOKEN: githubPersonalAccessToken,
      JWT_SECRET: jwtSecret
    },
    aws: {
      region: 'us-west-2',
      lambda: {
        memorySize: 1024,
        timeout: 25
      }
    }
  };
};
