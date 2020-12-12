import {consume, expose, validators} from '@layr/component';
import {attribute, method} from '@layr/storable';

import type {User} from './user';
import {Entity} from './entity';
import {WithOwner} from './with-owner';
import type {GitHub} from './github';
import type {Mailer} from './mailer';

const {maxLength, rangeLength, match, anyOf, integer, positive} = validators;

const frontendURL = process.env.FRONTEND_URL;

if (!frontendURL) {
  throw new Error(`'FRONTEND_URL' environment variable is missing`);
}

export type ImplementationCategory = 'frontend' | 'backend' | 'fullstack';
export type FrontendEnvironment = 'web' | 'mobile' | 'desktop';
export type ImplementationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

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
  @consume() static Mailer: typeof Mailer;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
    validators: [maxLength(500), match(/^https\:\/\/github\.com\//)]
  })
  repositoryURL!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
    validators: [anyOf(['frontend', 'backend', 'fullstack'])]
  })
  category!: ImplementationCategory;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string?', {
    validators: [anyOf([undefined, 'web', 'mobile', 'desktop'])]
  })
  frontendEnvironment?: FrontendEnvironment;

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
  status: ImplementationStatus = 'pending';

  @expose({get: 'admin'})
  @attribute('User?')
  reviewer?: User;

  @attribute('Date?') reviewStartedOn?: Date;

  @expose({get: true})
  @attribute('number', {validators: [integer(), positive()]})
  numberOfStars = 0;

  @attribute() githubData!: any;

  @attribute() githubDataFetchedOn?: Date;

  @expose({call: 'owner'}) @method() async submit() {
    const {Session, GitHub, Mailer} = this.constructor;

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
    this.githubDataFetchedOn = new Date();

    await this.save();

    try {
      await Mailer.sendMail({
        subject: 'A new RealWorld implementation has been submitted',
        text: `A new RealWorld implementation has been submitted:\n\n${frontendURL}/implementations/${this.id}/review\n`
      });
    } catch (error) {
      console.error(error);
    }
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
      {
        repositoryURL: true,
        category: true,
        frontendEnvironment: true,
        language: true,
        libraries: true,
        createdAt: true
      },
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
      frontendEnvironment: true,
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
    const {Session, Mailer} = this.constructor;

    await this.load({
      repositoryURL: true,
      category: true,
      status: true,
      owner: {username: true, email: true},
      reviewer: {}
    });

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Approval error');
    }

    this.status = 'approved';
    this.reviewStartedOn = undefined;

    await this.save();

    try {
      await Mailer.sendMail({
        to: this.owner.email,
        subject: 'Your RealWorld implementation has been approved',
        html: `
<p>Hi, ${this.owner.username},</p>

<p>Your <a href="${this.repositoryURL}">RealWorld implementation</a> has been approved and is now listed on the <a href="${frontendURL}/?category=${this.category}">home page</a> of our website.</p>

<p>Thanks a lot for your contribution!</p>

<p>--<br>The RealWorld example apps project</p>
`
      });
    } catch (error) {
      console.error(error);
    }
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

  @expose({call: true}) @method() static async refreshGitHubData() {
    // This method is executed 24 times a day, so each implementation should be
    // refreshed once a day

    // Trigger the execution in development mode with:
    // time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "typeof Implementation"}, "refreshGitHubData=>": {"()": []}}}' http://localhost:15542

    const {GitHub} = this;

    const numberOfImplementations = await this.count();
    const limit = Math.ceil(numberOfImplementations / 24);

    const implementations = await this.find(
      {},
      {repositoryURL: true},
      {sort: {githubDataFetchedOn: 'asc'}, limit}
    );

    for (const implementation of implementations) {
      try {
        const {owner, name} = parseRepositoryURL(implementation.repositoryURL);

        const {numberOfStars, githubData} = await GitHub.fetchRepository({owner, name});

        implementation.numberOfStars = numberOfStars;
        implementation.githubData = githubData;

        console.log(
          `The implementation '${implementation.repositoryURL}' has been successfully refreshed`
        );
      } catch (error) {
        console.error(
          `An error occurred while refreshing the implementation '${implementation.repositoryURL}' (${error.message})`
        );
      }

      implementation.githubDataFetchedOn = new Date();

      await implementation.save();
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
