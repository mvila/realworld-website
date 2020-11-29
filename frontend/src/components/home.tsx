import {Component, consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import React from 'react';
import {view} from '@layr/react-integration';

import {User} from './user';

export class Home extends Routable(Component) {
  @consume() static User: typeof User;

  @route('/') @view() static Main() {
    const {User} = this;

    return (
      <div>
        <button
          onClick={() => {
            User.SignIn.navigate();
          }}
        >
          Sign in
        </button>

        <button
          onClick={async () => {
            User.signOut.navigate();
          }}
        >
          Sign out
        </button>
      </div>
    );
  }
}
