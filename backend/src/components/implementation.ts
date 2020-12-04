import {consume, expose, validators, AttributeSelector} from '@layr/component';
import {attribute} from '@layr/storable';

import type {User} from './user';
import {Entity} from './entity';
import {WithOwner} from './with-owner';
import type {GitHub} from './github';

const {maxLength, rangeLength, match, anyOf, integer, positive} = validators;

@expose({
  get: {call: true},
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: ['owner', 'admin']},
    delete: {call: ['owner', 'admin']}
  }
})
export class Implementation extends WithOwner(Entity) {
  ['constructor']!: typeof Implementation;

  @consume() static GitHub: typeof GitHub;

  @expose({get: true}) @attribute() static categories = {
    frontend: {label: 'Frontend'},
    backend: {label: 'Backend'},
    fullstack: {label: 'Fullstack'}
  };

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
    validators: [maxLength(500), match(/^https\:\/\/github\.com\//)]
  })
  repositoryURL!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
    validators: [anyOf(['frontend', 'backend', 'fullstack'])]
  })
  category!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {validators: [rangeLength([1, 100])]})
  language!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string[]', {
    validators: [rangeLength([1, 5])],
    items: {validators: [rangeLength([1, 50])]}
  })
  libraries!: string[];

  @expose({get: ['owner', 'admin']})
  @attribute('string', {
    validators: [anyOf(['pending', 'reviewing', 'approved', 'rejected'])]
  })
  status = 'pending';

  @expose({get: 'admin'})
  @attribute('User?')
  reviewer?: User;

  @expose({get: true})
  @attribute('number', {validators: [integer(), positive()]})
  numberOfStars = 0;

  @attribute() githubData!: any;

  async beforeSave(attributeSelector: AttributeSelector) {
    const {Session, GitHub} = this.constructor;

    await super.beforeSave(attributeSelector);

    if (this.isNew()) {
      if (this.libraries.length === 0) {
        throw Object.assign(new Error(`'libraries' cannot be empty`), {
          displayMessage: 'You must specify at least one library or framework.'
        });
      }

      const {owner, name} = parseRepositoryURL(this.repositoryURL);

      const {numberOfStars, ownerId, githubData} = await GitHub.fetchRepository({owner, name});

      if (!Session.user!.isAdmin) {
        const userId = Session.user!.githubId;

        if (ownerId !== userId) {
          const contributor = await GitHub.findRepositoryContributor({owner, name, userId});

          if (contributor === undefined) {
            throw Object.assign(new Error(`Contributor not found`), {
              displayMessage: 'Sorry, you must be a contributor of the specified repository.'
            });
          }
        }
      }

      this.numberOfStars = numberOfStars;
      this.githubData = githubData;
    }
  }
}

function parseRepositoryURL(url: string) {
  if (!url.startsWith('https://github.com')) {
    throw Object.assign(new Error('Not a GitHub URL'), {
      displayMessage: 'Sorry, only GitHub repositories are supported.'
    });
  }

  const matches = url.match(/^https\:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);

  if (matches === null) {
    throw Object.assign(new Error('Invalid repository URL'), {
      displayMessage: 'The specified repository URL is invalid.'
    });
  }

  const [, owner, name] = matches;

  return {owner, name};
}
