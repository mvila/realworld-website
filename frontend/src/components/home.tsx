import {Component, consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {useCallback} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {view, useAsyncMemo} from '@layr/react-integration';
import {Box, StarIcon} from '@emotion-kit/react';

import {User} from './user';
import {Implementation, categories} from './implementation';
import type {Common} from './common';
import type {ImplementationCategory} from '../../../backend/src/components/implementation';

export class Home extends Routable(Component) {
  @consume() static User: typeof User;
  @consume() static Implementation: typeof Implementation;
  @consume() static Common: typeof Common;

  @route('/\\?:category') @view() static Main({
    category: currentCategory = 'frontend'
  }: {
    category: ImplementationCategory;
  }) {
    const {Implementation, Common} = this;

    const theme = useTheme();

    const [implementations, , loadingError] = useAsyncMemo(async () => {
      return await Implementation.find(
        {category: currentCategory, status: 'approved'},
        {repositoryURL: true, language: true, libraries: true, numberOfStars: true},
        {sort: {numberOfStars: 'desc'}}
      );
    }, [currentCategory]);

    const hiddenLinkStyle = {
      'color': theme.colors.text.normal,
      ':hover': {color: theme.colors.text.normal, textDecoration: 'none'}
    };

    const CategoryTab = useCallback(
      ({category, isFirst = false}: {category: ImplementationCategory; isFirst?: boolean}) => {
        const isCurrent = category === currentCategory;

        return (
          <this.Main.Link params={{category}} css={hiddenLinkStyle}>
            <div
              css={{
                'padding': '.75rem 1.25rem',
                'fontSize': theme.fontSizes.large,
                // 'fontWeight': theme.fontWeights.semibold,
                'lineHeight': theme.lineHeights.small,
                'color': isCurrent ? theme.colors.primary.textOnNormal : undefined,
                'backgroundColor': isCurrent ? theme.colors.primary.normal : undefined,
                'borderLeft': !isFirst ? `1px solid ${theme.colors.border.normal}` : undefined,
                'cursor': 'pointer',
                ':hover': {
                  backgroundColor: !isCurrent ? theme.colors.background.highlighted : undefined
                }
              }}
            >
              {categories[category].label}
            </div>
          </this.Main.Link>
        );
      },
      [currentCategory]
    );

    if (loadingError) {
      return <Common.ErrorMessage error={loadingError} />;
    }

    return (
      <div css={{marginTop: '3rem'}}>
        <div css={{display: 'flex', justifyContent: 'center'}}>
          <Box css={{display: 'flex', borderRadius: theme.radii.large}}>
            <CategoryTab category="frontend" isFirst />
            <CategoryTab category="backend" />
            <CategoryTab category="fullstack" />
          </Box>
        </div>

        {implementations === undefined && <Common.LoadingSpinner />}

        {implementations !== undefined && (
          <div css={{marginTop: '2rem'}}>
            {implementations.length > 0 &&
              implementations.map((impl) => (
                <a key={impl.id} href={impl.repositoryURL} target="_blank" css={hiddenLinkStyle}>
                  <div
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: -1,
                      padding: '.5rem 0',
                      borderTop: `1px solid ${theme.colors.border.normal}`,
                      borderBottom: `1px solid ${theme.colors.border.normal}`
                    }}
                  >
                    <div css={{flex: 1}}>
                      <div
                        css={{
                          fontSize: theme.fontSizes.large,
                          fontWeight: theme.fontWeights.semibold
                        }}
                      >
                        {impl.formatLibraries()}
                      </div>
                      <div css={{color: theme.colors.text.muted}}>{impl.formatRepositoryURL()}</div>
                    </div>
                    <div css={{width: '125px'}}>{impl.language}</div>
                    <div css={{width: '90px', display: 'flex', alignItems: 'center'}}>
                      <StarIcon
                        size={20}
                        color={theme.colors.text.muted}
                        outline
                        css={{marginRight: '.25rem'}}
                      />
                      {impl.formatNumberOfStars()}
                    </div>
                  </div>
                </a>
              ))}

            {implementations.length === 0 && (
              <Box css={{marginTop: '2rem', padding: '1rem'}}>
                There are no implementations in this category.
              </Box>
            )}
          </div>
        )}
      </div>
    );
  }
}
