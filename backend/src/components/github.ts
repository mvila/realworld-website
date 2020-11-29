import {Component} from '@layr/component';
import fetch from 'cross-fetch';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_LOGIN_URL = 'https://github.com/login/oauth/access_token';

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

export class GitHub extends Component {
  static async fetchUser({accessToken}: {accessToken: string}) {
    const [userData, emailsData] = await Promise.all([
      GitHub.fetch('/user', {accessToken}),
      GitHub.fetch('/user/emails', {accessToken})
    ]);

    const githubData = {user: userData, emails: emailsData};

    let {id: githubId, login: username, name, avatar_url: avatarURL} = userData;

    if (!name) {
      name = '';
    }

    let email: string | undefined;

    for (const {email: email_, primary, verified} of emailsData) {
      if (primary && verified) {
        email = email_;
        break;
      }
    }

    if (email === undefined) {
      throw Object.assign(new Error('Primary email not found'), {
        displayMessage: `Couldn't get your email address from GitHub. Please make sure you have a verified primary address in your GitHub account`
      });
    }

    return {githubId, username, email, name, avatarURL, githubData};
  }

  static async fetch(
    path: string,
    {method = 'GET', body, accessToken}: {method?: string; body?: any; accessToken?: string} = {}
  ) {
    const response = await fetch(GITHUB_API_BASE_URL + path, {
      method,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(method === 'POST' && {'Content-Type': 'application/json'}),
        ...(accessToken !== undefined && {Authorization: `token ${accessToken}`})
      },
      ...(body !== undefined && {body: JSON.stringify(body)})
    });

    const result = await response.json();

    const expectedStatus = method === 'POST' ? 201 : 200;

    if (response.status !== expectedStatus) {
      throw new Error(
        `An error occurred while fetching the GitHub API (HTTP status: ${
          response.status
        }, result: ${JSON.stringify(result)}).`
      );
    }

    return result;
  }

  static async fetchAccessToken({code, state}: {code: string; state: string}) {
    const response = await fetch(GITHUB_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        state
      })
    });

    if (response.status !== 200) {
      throw new Error(
        `An error occurred while getting an access token from GitHub (HTTP status: ${response.status}`
      );
    }

    const {access_token: accessToken} = await response.json();

    return accessToken as string;
  }
}
