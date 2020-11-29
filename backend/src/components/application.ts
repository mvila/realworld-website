import {Component, provide} from '@layr/component';

import {User} from './user';
import {Session} from './session';
import {GitHub} from './github';
import {JWT} from './jwt';

export class Application extends Component {
  @provide() static User = User;
  @provide() static Session = Session;
  @provide() static GitHub = GitHub;
  @provide() static JWT = JWT;
}
