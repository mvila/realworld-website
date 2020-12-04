import {Component, consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {jsx} from '@emotion/react';
import {view} from '@layr/react-integration';

import {User} from './user';

export class Home extends Routable(Component) {
  @consume() static User: typeof User;

  @route('/') @view() static Main() {
    return <div></div>;
  }
}
