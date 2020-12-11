import {Component, provide} from '@layr/component';

import {User} from './user';
import {Session} from './session';
import {Implementation} from './implementation';
import {GitHub} from './github';
import {Mailer} from './mailer';
import {JWT} from './jwt';

export class Application extends Component {
  @provide() static User = User;
  @provide() static Session = Session;
  @provide() static Implementation = Implementation;
  @provide() static GitHub = GitHub;
  @provide() static Mailer = Mailer;
  @provide() static JWT = JWT;
}
