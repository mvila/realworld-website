import {Component, consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment} from 'react';
import {jsx, useTheme, Theme} from '@emotion/react';
import {view, useAsyncMemo} from '@layr/react-integration';
import {Box, Badge, StarIcon} from '@emotion-kit/react';
import sortBy from 'lodash/sortBy';

import {User} from './user';
import {Implementation, implementationCategories} from './implementation';
import type {Common} from './common';
import type {ImplementationCategory} from '../../../backend/src/components/implementation';

const filterHeaderStyle = (theme: Theme) =>
  ({
    fontSize: theme.fontSizes.small,
    color: theme.colors.text.muted,
    fontWeight: theme.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  } as const);

const hiddenLinkStyle = {
  'color': 'inherit',
  ':hover': {color: 'inherit', textDecoration: 'none'}
};

export class Home extends Routable(Component) {
  @consume() static User: typeof User;
  @consume() static Implementation: typeof Implementation;
  @consume() static Common: typeof Common;

  @route('/\\?:category&:language') @view() static Main({
    category: currentCategory = 'frontend',
    language: currentLanguage = 'all'
  }: {
    category: ImplementationCategory;
    language: string;
  }) {
    const {Implementation, Common} = this;

    const theme = useTheme();

    const [implementations, , loadingError] = useAsyncMemo(async () => {
      return await Implementation.find(
        {category: currentCategory, status: 'approved'},
        {
          repositoryURL: true,
          frontendEnvironment: true,
          language: true,
          libraries: true,
          numberOfStars: true
        },
        {sort: {numberOfStars: 'desc'}}
      );
    }, [currentCategory]);

    if (loadingError) {
      return <Common.ErrorMessage error={loadingError} />;
    }

    return (
      <div css={{margin: '3rem 0 4rem 0'}}>
        <this.CategoryFilter currentCategory={currentCategory} />

        {implementations === undefined && (
          <div css={{marginBottom: 2000}}>
            <Common.LoadingSpinner />
          </div>
        )}

        {implementations !== undefined && implementations.length > 0 && (
          <div css={{marginTop: '2rem', display: 'flex'}}>
            <div css={theme.responsive({marginRight: '3rem', display: ['block', , 'none']})}>
              <this.LanguageFilter
                implementations={implementations}
                currentLanguage={currentLanguage}
              />
            </div>

            <div css={{flex: 1}}>
              {implementations
                .filter(({language}) =>
                  currentLanguage !== 'all' ? language.toLowerCase() === currentLanguage : true
                )
                .map((implementation, index) => (
                  <Fragment key={implementation.id}>
                    {index > 0 && <hr css={{marginTop: '.75rem', marginBottom: '.75rem'}} />}

                    <a href={implementation.repositoryURL} target="_blank" css={hiddenLinkStyle}>
                      <div
                        css={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}
                      >
                        <div
                          css={theme.responsive({
                            flex: ['1', , , '1 0 100%'],
                            marginBottom: [, , , '.5rem'],
                            paddingRight: '1rem',
                            lineHeight: theme.lineHeights.small
                          })}
                        >
                          <div css={{display: 'flex', alignItems: 'center'}}>
                            <div
                              css={{
                                fontSize: theme.fontSizes.large,
                                fontWeight: theme.fontWeights.semibold
                              }}
                            >
                              {implementation.formatLibraries()}
                            </div>
                            {implementation.frontendEnvironment !== undefined &&
                              implementation.frontendEnvironment !== 'web' && (
                                <Badge
                                  color="primary"
                                  variant="outline"
                                  css={{marginLeft: '.75rem'}}
                                >
                                  {implementation.formatFrontendEnvironment()}
                                </Badge>
                              )}
                          </div>
                          <div css={{marginTop: '.3rem', color: theme.colors.text.muted}}>
                            {implementation.formatRepositoryURL()}
                          </div>
                        </div>

                        <div css={{width: '150px', lineHeight: 1}}>{implementation.language}</div>

                        <div
                          css={{
                            width: '90px',
                            display: 'flex',
                            alignItems: 'center',
                            lineHeight: 1
                          }}
                        >
                          <StarIcon
                            size={20}
                            color={theme.colors.text.muted}
                            outline
                            css={{marginRight: '.25rem'}}
                          />
                          {implementation.formatNumberOfStars()}
                        </div>
                      </div>
                    </a>
                  </Fragment>
                ))}
            </div>
          </div>
        )}

        {implementations !== undefined && implementations.length === 0 && (
          <Box css={{marginTop: '2rem', padding: '1rem'}}>
            There are no implementations in this category.
          </Box>
        )}
      </div>
    );
  }

  @view() static CategoryFilter({currentCategory}: {currentCategory: ImplementationCategory}) {
    const theme = useTheme();

    return (
      <div
        css={{
          display: 'flex',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.colors.border.normal}`
        }}
      >
        <div
          css={{
            display: 'flex',
            borderTop: `1px solid ${theme.colors.border.normal}`,
            borderLeft: `1px solid ${theme.colors.border.normal}`,
            borderRight: `1px solid ${theme.colors.border.normal}`,
            borderTopLeftRadius: theme.radii.large,
            borderTopRightRadius: theme.radii.large
          }}
        >
          <this.CategoryTab
            category="frontend"
            isCurrent={currentCategory === 'frontend'}
            isFirst
          />
          <this.CategoryTab category="backend" isCurrent={currentCategory === 'backend'} />
          <this.CategoryTab
            category="fullstack"
            isCurrent={currentCategory === 'fullstack'}
            isLast
          />
        </div>
      </div>
    );
  }

  @view() static CategoryTab({
    category,
    isCurrent,
    isFirst = false,
    isLast = false
  }: {
    category: ImplementationCategory;
    isCurrent: boolean;
    isFirst?: boolean;
    isLast?: boolean;
  }) {
    const theme = useTheme();

    return (
      <this.Main.Link params={{category}} css={hiddenLinkStyle}>
        <div
          css={theme.responsive({
            'padding': ['.75rem 1.25rem', , , '.5rem .75rem'],
            'fontSize': [theme.fontSizes.large, , , theme.fontSizes.normal],
            'lineHeight': theme.lineHeights.small,
            'color': isCurrent ? theme.colors.primary.textOnNormal : undefined,
            'backgroundColor': isCurrent ? theme.colors.primary.normal : undefined,
            'borderLeft': !isFirst ? `1px solid ${theme.colors.border.normal}` : undefined,
            'borderTopLeftRadius': isFirst ? theme.radii.normal : undefined,
            'borderTopRightRadius': isLast ? theme.radii.normal : undefined,
            ':hover': {
              backgroundColor: !isCurrent ? theme.colors.background.highlighted : undefined
            }
          })}
        >
          {implementationCategories[category].label}
        </div>
      </this.Main.Link>
    );
  }

  @view() static LanguageFilter({
    implementations,
    currentLanguage
  }: {
    implementations: Implementation[];
    currentLanguage: string;
  }) {
    const theme = useTheme();

    const languages: {[language: string]: number} = Object.create(null);

    for (const {language} of implementations) {
      if (language in languages) {
        languages[language]++;
      } else {
        languages[language] = 1;
      }
    }

    const sortedLanguages = sortBy(Object.entries(languages), ([, count]) => -count).map(
      ([language]) => language
    );

    sortedLanguages.unshift('All');

    return (
      <div>
        <div css={filterHeaderStyle(theme)}>Languages</div>

        {sortedLanguages.map((language) => (
          <this.LanguageOption
            key={language}
            language={language}
            isCurrent={language.toLowerCase() === currentLanguage}
          />
        ))}
      </div>
    );
  }

  @view() static LanguageOption({language, isCurrent}: {language: string; isCurrent: boolean}) {
    const theme = useTheme();

    const params = this.getRouter().getCurrentParams();

    return (
      <this.Main.Link params={{...params, language: language.toLowerCase()}} css={hiddenLinkStyle}>
        <div
          css={{
            'marginTop': '.5rem',
            'fontSize': theme.fontSizes.normal,
            'lineHeight': theme.lineHeights.small,
            'color': isCurrent ? theme.colors.text.normal : theme.colors.text.muted,
            ':hover': {
              textDecoration: 'underline'
            }
          }}
        >
          {language}
        </div>
      </this.Main.Link>
    );
  }
}
