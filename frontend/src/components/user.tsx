import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import React from 'react';
import {view, useAsyncCall} from '@layr/react-integration';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Session} from './session';
import type {Home} from './home';

const githubClientId = process.env.GITHUB_CLIENT_ID;

if (!githubClientId) {
  throw new Error(`'GITHUB_CLIENT_ID' environment variable is missing`);
}

export const getUser = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Session: typeof Session;
    @consume() static Home: typeof Home;

    @route('/sign-in') @view() static SignIn() {
      const {Session, Home} = this;

      if (Session.user !== undefined) {
        Home.Main.redirect(undefined, {defer: true});
        return null;
      }

      const oAuthState = ((Math.random() * Math.pow(36, 6)) | 0).toString(36);

      window.sessionStorage.setItem('oAuthState', oAuthState);

      const url = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&state=${oAuthState}`;
      window.location.replace(url);
      return null;
    }

    @route('/oauth/callback\\?:code&:state&:error') @view() static OAuthCallback({
      code,
      state,
      error
    }: {code?: string; state?: string; error?: string} = {}) {
      const {Home} = this;

      const [isSigningIn, signingInError] = useAsyncCall(async () => {
        const savedState = window.sessionStorage.getItem('oAuthState');
        window.sessionStorage.removeItem('oAuthState');

        if (!code || state !== savedState || error) {
          throw new Error('Authentication failed');
        }

        await this.signIn({code, state});
        Home.Main.reload();
      });

      if (isSigningIn) {
        return null;
      }

      if (signingInError) {
        return <div>Authentication failed!</div>;
      }

      return null;
    }

    @route('/sign-out') static signOut() {
      const {Session, Home} = this;

      Session.token = undefined;
      Home.Main.reload();
    }
  }

  return User;
};

export declare const User: ReturnType<typeof getUser>;

export type User = InstanceType<typeof User>;
