import {consume, expose} from '@layr/component';
import {secondaryIdentifier, attribute, method} from '@layr/storable';
import {role} from '@layr/with-roles';

import {Entity} from './entity';
import {GitHub} from './github';

@expose({get: {call: true}, prototype: {load: {call: true}, save: {call: 'self'}}})
export class User extends Entity {
  ['constructor']!: typeof User;

  @consume() static GitHub: typeof GitHub;

  @secondaryIdentifier('number') githubId!: number;

  @expose({get: 'self'}) @secondaryIdentifier('string') username!: string;

  @secondaryIdentifier('string') email!: string;

  @expose({get: 'self'}) @attribute('string') avatarURL!: string;

  @role('creator') creatorRoleResolver() {
    return this.isNew();
  }

  @role('self') selfRoleResolver() {
    return this === this.constructor.Session.user;
  }

  @expose({call: true}) @method() static async signIn({
    code,
    state
  }: {
    code: string;
    state: string;
  }) {
    const {GitHub} = this;
    const {Session} = this;

    const accessToken = await GitHub.fetchAccessToken({code, state});

    const [userData, emailsData] = await Promise.all([
      GitHub.fetch('/user', {accessToken}),
      GitHub.fetch('/user/emails', {accessToken})
    ]);

    const {id: githubId, login: username, avatar_url: avatarURL} = userData;

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

    let user = await this.fork()
      .detach()
      .get(
        {githubId},
        {githubId: true, username: true, email: true, avatarURL: true},
        {throwIfMissing: false}
      );

    if (user !== undefined) {
      if (user.username !== username || user.email !== email || user.avatarURL !== avatarURL) {
        Object.assign(user, {username, email, avatarURL});
        await user.save();
      }
    } else {
      user = new this({githubId, username, email, avatarURL});
      await user.save();
    }

    Session.token = Session.generateToken(user.id);
  }
}
