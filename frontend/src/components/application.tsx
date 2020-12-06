import {provide} from '@layr/component';
import {Storable} from '@layr/storable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import {Fragment} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {view, useBrowserRouter} from '@layr/react-integration';
import {Container, DropdownMenu, ChevronDownIcon} from '@emotion-kit/react';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {getSession} from './session';
import {getUser} from './user';
import {getImplementation} from './implementation';
import {Home} from './home';
import {Common} from './common';
// @ts-ignore
import realWorldLogo from '../assets/realworld-logo-dark-mode-20201201.immutable.png';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends BackendApplicationProxy {
    @provide() static Session = getSession(BackendApplicationProxy.Session);
    @provide() static User = getUser(BackendApplicationProxy.User);
    @provide() static Implementation = getImplementation(BackendApplicationProxy.Implementation);
    @provide() static Home = Home;
    @provide() static Common = Common;

    @view() static Root() {
      const {Common} = this;

      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => <Common.RouteNotFound />
      });

      return <this.Layout>{content}</this.Layout>;
    }

    @view() static Layout({children}: {children?: React.ReactNode}) {
      const theme = useTheme();

      return (
        <>
          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container css={{maxWidth: '960px'}}>
              <this.Header />
            </Container>
          </div>

          <div>
            <Container css={{maxWidth: '960px'}}>{children}</Container>
          </div>
        </>
      );
    }

    @view() static Header() {
      const {Home, User, Session, Implementation} = this;

      const {user} = Session;

      const theme = useTheme();

      const menuStyle = {
        paddingLeft: 0,
        listStyle: 'none',
        margin: 0,
        display: 'flex',
        alignItems: 'center'
      };
      const menuItemStyle = {
        margin: '0 0 0 1.5rem',
        display: 'flex'
      };
      const menuItemLinkStyle = {
        'color': theme.colors.primary.normal,
        'cursor': 'pointer',
        ':hover': {
          color: theme.colors.primary.highlighted,
          textDecoration: 'underline'
        }
      };

      return (
        <header css={{padding: '.5rem 0 .4rem 0', display: 'flex', alignItems: 'center'}}>
          <Home.Main.Link css={{position: 'relative', top: '-5px'}}>
            <img src={realWorldLogo} alt="RealWorld Example Apps" css={{width: 300}} />
          </Home.Main.Link>

          <nav css={{marginLeft: 'auto'}}>
            <ul css={menuStyle}>
              <li css={menuItemStyle}>
                <a
                  href="https://github.com/gothinkster/realworld/tree/master/spec"
                  target="_blank"
                  css={menuItemLinkStyle}
                >
                  Create
                </a>
              </li>

              <li css={menuItemStyle}>
                <Implementation.Submit.Link css={menuItemLinkStyle}>
                  Submit
                </Implementation.Submit.Link>
              </li>

              {user?.isAdmin && (
                <li css={menuItemStyle}>
                  <DropdownMenu
                    items={[
                      {
                        label: 'Review submissions',
                        onClick: () => {
                          Implementation.ReviewList.navigate();
                        }
                      }
                    ]}
                  >
                    {({open}) => (
                      <div
                        onClick={open}
                        css={{
                          ...menuItemLinkStyle,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Administration
                        <ChevronDownIcon size={25} css={{marginLeft: '.15rem'}} />
                      </div>
                    )}
                  </DropdownMenu>
                </li>
              )}

              {user !== undefined ? (
                <li css={menuItemStyle}>
                  <user.Menu />
                </li>
              ) : (
                <li css={menuItemStyle}>
                  <User.SignIn.Link css={menuItemLinkStyle}>Sign in</User.SignIn.Link>
                </li>
              )}
            </ul>
          </nav>
        </header>
      );
    }
  }

  return Application;
};
