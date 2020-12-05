import {consume, expose, validators} from '@layr/component';
import {attribute, method} from '@layr/storable';

import type {User} from './user';
import {Entity} from './entity';
import {WithOwner} from './with-owner';
import type {GitHub} from './github';

const {maxLength, rangeLength, match, anyOf, integer, positive} = validators;

const MAXIMUM_REVIEW_DURATION = 5 * 60 * 1000; // 5 minutes

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

  @attribute('Date?') reviewStartedOn?: Date;

  @expose({get: true})
  @attribute('number', {validators: [integer(), positive()]})
  numberOfStars = 0;

  @attribute() githubData!: any;

  @expose({call: 'owner'}) @method() async submit() {
    const {Session, GitHub} = this.constructor;

    if (!this.isNew()) {
      throw new Error('Cannot submit a non-new implementation');
    }

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

    await this.save();
  }

  @expose({call: 'admin'}) @method() static async findSubmissionsToReview<
    T extends typeof Implementation
  >(this: T) {
    const {Session} = this;

    return (await this.find(
      {
        $or: [
          {status: 'pending'},
          {
            status: 'reviewing',
            reviewer: Session.user
          },
          {
            status: 'reviewing',
            reviewStartedOn: {$lessThan: new Date(Date.now() - MAXIMUM_REVIEW_DURATION)}
          }
        ]
      },
      {repositoryURL: true, category: true, language: true, libraries: true, createdAt: true},
      {sort: {created: 'desc'}}
    )) as InstanceType<T>[];
  }

  @expose({call: 'admin'}) @method() static async reviewSubmission<T extends typeof Implementation>(
    this: T,
    id: string
  ) {
    const {Session} = this;

    const implementation = (await this.get(id, {
      repositoryURL: true,
      category: true,
      language: true,
      libraries: true,
      status: true,
      reviewer: {},
      reviewStartedOn: true
    })) as InstanceType<T>;

    if (implementation.status === 'reviewing') {
      const reviewDuration = Date.now() - implementation.reviewStartedOn!.valueOf();

      if (implementation.reviewer !== Session.user && reviewDuration < MAXIMUM_REVIEW_DURATION) {
        throw Object.assign(new Error('Implementation currently reviewed'), {
          displayMessage: 'This submission is currently being reviewed by another administrator.'
        });
      }
    } else if (implementation.status !== 'pending') {
      throw Object.assign(new Error('Implementation already reviewed'), {
        displayMessage: 'This submission has already been reviewed.'
      });
    }

    implementation.status = 'reviewing';
    implementation.reviewer = Session.user;
    implementation.reviewStartedOn = new Date();

    await implementation.save();

    return implementation;
  }

  @expose({call: 'admin'}) @method() async approveSubmission() {
    const {Session} = this.constructor;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Approval error');
    }

    this.status = 'approved';
    this.reviewStartedOn = undefined;

    await this.save();
  }

  @expose({call: 'admin'}) @method() async rejectSubmission() {
    const {Session} = this.constructor;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Rejection error');
    }

    this.status = 'rejected';
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewStartedOn: true});
  }

  @expose({call: 'admin'}) @method() async cancelSubmissionReview() {
    const {Session} = this.constructor;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Cancellation error');
    }

    this.status = 'pending';
    this.reviewer = undefined;
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewer: true, reviewStartedOn: true});
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
