import {Component, consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment, useMemo} from 'react';
import {view, useDelay} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {Button} from '@emotion-starter/react';
import {Box, ErrorIcon} from '@emotion-kit/react';

import type {Home} from './home';
import type {User} from './user';
import type {Session} from './session';

export class Common extends Routable(Component) {
  @consume() static Home: typeof Home;
  @consume() static Session: typeof Session;
  @consume() static User: typeof User;

  static ensureGuest(content: () => JSX.Element | null) {
    const {Home, Session} = this;

    if (Session.user !== undefined) {
      Home.Main.redirect(undefined, {defer: true});
      return null;
    }

    return content();
  }

  static ensureUser(content: (user: User) => JSX.Element | null) {
    const {User, Session} = this;

    if (Session.user === undefined) {
      User.SignIn.redirect({redirectURL: this.getRouter().getCurrentPath()}, {defer: true});
      return null;
    }

    return content(Session.user);
  }

  static ensureAdmin(content: (user: User) => JSX.Element | null) {
    const {User, Session} = this;

    if (Session.user === undefined) {
      User.SignIn.redirect({redirectURL: this.getRouter().getCurrentPath()}, {defer: true});
      return null;
    }

    if (!Session.user.isAdmin) {
      return (
        <this.ErrorLayout>Sorry, this page is restricted to administrators only.</this.ErrorLayout>
      );
    }

    return content(Session.user);
  }

  @view() static Dialog({
    title,
    width = 600,
    children
  }: {
    title: string;
    width?: number;
    children: React.ReactNode;
  }) {
    return (
      <Box css={{width, margin: '3rem auto 0 auto', padding: '2rem'}}>
        <h3 css={{marginBottom: '2rem', lineHeight: 1}}>{title}</h3>
        {children}
      </Box>
    );
  }

  @view() static ButtonBar({className, children}: {className?: string; children: React.ReactNode}) {
    return (
      <div className={className} css={{marginTop: '2rem', display: 'flex', alignItems: 'center'}}>
        {children}
      </div>
    );
  }

  @view() static ErrorLayout({children}: {children: React.ReactNode}) {
    const theme = useTheme();

    return (
      <div
        css={{
          width: '100%',
          padding: '6rem 15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div>
          <ErrorIcon size={50} color={theme.colors.negative.normal} />
        </div>
        <div css={{marginTop: '1rem'}}>{children}</div>
      </div>
    );
  }

  @view() static RouteNotFound() {
    return <this.ErrorLayout>Sorry, there is nothing there.</this.ErrorLayout>;
  }

  @view() static ErrorMessage({
    error,
    onRetry,
    className
  }: {
    error?: {displayMessage?: string};
    onRetry?: Function;
    className?: string;
  }) {
    const theme = useTheme();

    const message = error?.displayMessage || 'Sorry, an error occurred.';

    return (
      <Box className={className} css={{marginBottom: '2rem', padding: '.5rem 1rem'}}>
        <div css={{color: theme.colors.negative.normal}}>{message}</div>
        {onRetry && (
          <>
            <hr />
            <div>
              <Button onClick={() => onRetry()}>Retry</Button>
            </div>
          </>
        )}
      </Box>
    );
  }

  @view() static LoadingSpinner({delay = 750}: {delay?: number}) {
    const style = useMemo(
      () => ({
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        margin: '90px auto',
        position: 'relative' as const,
        borderTop: '3px solid rgba(0, 0, 0, 0.1)',
        borderRight: '3px solid rgba(0, 0, 0, 0.1)',
        borderBottom: '3px solid rgba(0, 0, 0, 0.1)',
        borderLeft: '3px solid #818a91',
        transform: 'translateZ(0)',
        animation: 'loading-spinner 0.5s infinite linear'
      }),
      []
    );

    return (
      <this.Delayed duration={delay}>
        <div className="loading-spinner" style={style}>
          <style>
            {`
          @keyframes loading-spinner {
            0% {transform: rotate(0deg);}
            100% {transform: rotate(360deg);}
          }
          `}
          </style>
        </div>
      </this.Delayed>
    );
  }

  @view() static Delayed({
    duration = 750,
    children
  }: {
    duration?: number;
    children: React.ReactElement;
  }) {
    const [isElapsed] = useDelay(duration);

    if (isElapsed) {
      return children;
    }

    return null;
  }
}
