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
      this.fetch('/user', {accessToken}),
      this.fetch('/user/emails', {accessToken})
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

  static async fetchRepository({owner, name}: {owner: string; name: string}) {
    let githubData;

    try {
      githubData = await this.fetch(`/repos/${owner}/${name}`);
    } catch (error) {
      if (error.status === 404) {
        throw Object.assign(new Error('Repository not found'), {
          displayMessage: `The specified repository doesn't exist.`
        });
      }

      throw error;
    }

    const {
      stargazers_count: numberOfStars,
      owner: {id: ownerId}
    } = githubData;

    return {numberOfStars, ownerId, githubData};
  }

  static async findRepositoryContributor({
    owner,
    name,
    userId
  }: {
    owner: string;
    name: string;
    userId: number;
  }) {
    const contributors = await this.fetch(`/repos/${owner}/${name}/contributors?per_page=100`);

    for (const contributor of contributors) {
      if (contributor.id === userId) {
        return {githubData: contributor};
      }
    }

    if (contributors.length === 100) {
      throw Object.assign(new Error('Cannot fetch more than 100 contributors'), {
        displayMessage:
          'The specified repository have a lot of contributors and we are currently unable to fetch them all.'
      });
    }

    return undefined;
  }

  static async fetch(
    path: string,
    {
      method = 'GET',
      body,
      accessToken = githubPersonalAccessToken
    }: {method?: string; body?: any; accessToken?: string} = {}
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
      throw Object.assign(
        new Error(
          `An error occurred while fetching the GitHub API (HTTP status: ${
            response.status
          }, result: ${JSON.stringify(result)}).`
        ),
        {status: response.status}
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
