import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {useMemo} from 'react';
import {view, useAsyncCallback, useAsyncMemo} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {Input, Select, Button} from '@emotion-starter/react';
import {LaunchIcon} from '@emotion-kit/react';
import compact from 'lodash/compact';
import {formatDistanceToNowStrict} from 'date-fns';

import type {Implementation as BackendImplementation} from '../../../backend/src/components/implementation';
import type {Home} from './home';
import type {Common} from './common';

export const getImplementation = (Base: typeof BackendImplementation) => {
  class Implementation extends Routable(Base) {
    ['constructor']!: typeof Implementation;

    @consume() static Home: typeof Home;
    @consume() static Common: typeof Common;

    @route('/implementations/submit') @view() static Submit() {
      const {Home, Common} = this;

      return Common.ensureUser(() => {
        const implementation = useMemo(
          () =>
            new this({
              repositoryURL: 'https://github.com/gothinkster/react-redux-realworld-example-app',
              category: 'frontend',
              language: 'JavaScript',
              libraries: ['React', '']
            }),
          []
        );

        return (
          <implementation.Form
            onSubmit={async () => {
              await implementation.save();
              Home.Main.navigate();
            }}
            onCancel={() => {
              Home.Main.navigate();
            }}
          />
        );
      });
    }

    @view() Form({onSubmit, onCancel}: {onSubmit: () => Promise<void>; onCancel: () => void}) {
      const {Common} = this.constructor;

      const theme = useTheme();

      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(async () => {
        this.repositoryURL = this.repositoryURL.trim();
        this.language = this.language.trim();
        this.libraries = compact(this.libraries.map((library) => library.trim()));
        await onSubmit();
      });

      if (!isSubmitting && this.libraries[this.libraries.length - 1] !== '') {
        this.libraries = [...this.libraries, ''];
      }

      const libraryPlaceholder =
        this.category === 'frontend'
          ? 'React'
          : this.category === 'backend'
          ? 'Express'
          : this.category === 'fullstack'
          ? 'Meteor'
          : '';

      const controlStyle = {marginTop: '1rem', display: 'flex', flexDirection: 'column'} as const;
      const labelStyle = {
        marginBottom: '.5rem',
        color: theme.colors.text.muted,
        lineHeight: theme.lineHeights.small
      };

      return (
        <Common.Dialog title="Submit an implementation">
          {!isSubmitting && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              autoComplete="off"
            >
              {submitError && <Common.ErrorMessage error={submitError} />}

              <div css={controlStyle}>
                <label htmlFor="repositoryURL" css={labelStyle}>
                  Repository URL
                </label>
                <div css={{display: 'flex', alignItems: 'center'}}>
                  <Input
                    id="repositoryURL"
                    value={this.repositoryURL}
                    onChange={(event) => {
                      this.repositoryURL = event.target.value;
                    }}
                    placeholder="https://github.com/owner/repository"
                    required
                    autoFocus
                    css={{width: '100%'}}
                  />
                  <OpenURLButton url={this.repositoryURL} css={{marginLeft: '.5rem'}} />
                </div>
              </div>

              <div css={{display: 'flex'}}>
                <div css={controlStyle}>
                  <label htmlFor="category" css={labelStyle}>
                    Category
                  </label>
                  <Select
                    id="category"
                    value={this.category}
                    onChange={(event) => {
                      this.category = event.target.value;
                    }}
                    required
                    css={{width: 200}}
                  >
                    <option value="" />
                    {Object.entries(this.constructor.categories).map(([value, {label}]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div css={{...controlStyle, marginLeft: '1rem'}}>
                  <label htmlFor="language" css={labelStyle}>
                    Language
                  </label>
                  <Input
                    id="language"
                    value={this.language}
                    onChange={(event) => {
                      this.language = event.target.value;
                    }}
                    required
                    placeholder="JavaScript"
                    css={{width: 200}}
                  />
                </div>
              </div>

              <div css={{...controlStyle, marginBottom: '-.5rem'}}>
                <label css={labelStyle}>Libraries/Frameworks</label>
                {this.libraries.map((_, index) => (
                  <Input
                    key={index}
                    value={this.libraries[index]}
                    onChange={(event) => {
                      this.libraries[index] = event.target.value;
                    }}
                    placeholder={index === 0 ? libraryPlaceholder : 'One more?'}
                    css={{width: 200, marginBottom: '.5rem'}}
                  />
                ))}
              </div>

              <Common.ButtonBar>
                <Button type="submit" color="primary">
                  Submit
                </Button>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    onCancel();
                  }}
                  variant="outline"
                  css={{marginLeft: '1rem'}}
                >
                  Cancel
                </Button>
              </Common.ButtonBar>
            </form>
          )}

          {isSubmitting && <Common.LoadingSpinner delay={0} />}
        </Common.Dialog>
      );
    }

    @route('/implementations/review') @view() static Review() {
      const {Common} = this;

      const theme = useTheme();

      const [implementations] = useAsyncMemo(async () => {
        return this.find(
          {status: 'pending'},
          {repositoryURL: true, category: true, language: true, libraries: true, createdAt: true},
          {sort: {created: 'desc'}}
        );
      });

      if (implementations === undefined) {
        return <Common.LoadingSpinner />;
      }

      const headerStyle = {
        display: 'flex',
        paddingBottom: '.5rem',
        fontSize: '75%',
        color: theme.colors.text.muted,
        fontWeight: theme.fontWeights.bold,
        textTransform: 'uppercase',
        letterSpacing: '.5px'
      } as const;

      const rowStyle = {
        'display': 'flex',
        'marginBottom': '-1px',
        'padding': '.5rem 0',
        'borderTop': `1px solid ${theme.colors.border.normal}`,
        'borderBottom': `1px solid ${theme.colors.border.normal}`,
        'cursor': 'pointer',
        ':hover': {
          backgroundColor: theme.colors.background.highlighted
        }
      } as const;

      const columnStyles = [
        {width: '300px'},
        {width: '100px'},
        {width: '100px'},
        {flex: 1},
        {paddingRight: 0, width: '130px'}
      ] as const;

      const cellStyle = {
        paddingRight: '1rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      } as const;

      return (
        <div css={{marginTop: '1rem'}}>
          <h3>Review submissions</h3>

          <div css={{marginTop: '2rem'}}>
            <div css={headerStyle}>
              <div css={{...cellStyle, ...columnStyles[0]}}>Repository</div>
              <div css={{...cellStyle, ...columnStyles[1]}}>Category</div>
              <div css={{...cellStyle, ...columnStyles[2]}}>Language</div>
              <div css={{...cellStyle, ...columnStyles[3]}}>Libraries/Frameworks</div>
              <div css={{...cellStyle, ...columnStyles[4]}}>Submitted</div>
            </div>

            {implementations.map((impl) => {
              return (
                <div key={impl.id} css={rowStyle}>
                  <div css={{...cellStyle, ...columnStyles[0]}}>
                    {formatRepositoryURL(impl.repositoryURL)}
                  </div>
                  <div css={{...cellStyle, ...columnStyles[1]}}>
                    {(this.categories as any)[impl.category].label}
                  </div>
                  <div css={{...cellStyle, ...columnStyles[2]}}>{impl.language}</div>
                  <div css={{...cellStyle, ...columnStyles[3]}}>{impl.libraries.join(' + ')}</div>
                  <div css={{...cellStyle, ...columnStyles[4]}}>
                    {formatDistanceToNowStrict(impl.createdAt, {addSuffix: true})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  return Implementation;
};

function formatRepositoryURL(url: string) {
  return url.slice('https://github.com/'.length);
}

function OpenURLButton({url, className}: {url?: string; className?: string}) {
  const theme = useTheme();

  return (
    <LaunchIcon
      onClick={
        url
          ? () => {
              window.open(url, 'realworld-repository-review');
            }
          : undefined
      }
      size={24}
      css={{
        'color': url ? theme.colors.text.muted : theme.colors.border.normal,
        'cursor': url ? 'pointer' : undefined,
        ':hover': url ? {color: theme.colors.text.normal} : undefined
      }}
      className={className}
    />
  );
}
