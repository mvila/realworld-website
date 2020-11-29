import {provide} from '@layr/component';
import {Storable} from '@layr/storable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import React from 'react';
import {view, useBrowserRouter} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {getSession} from './session';
import {getUser} from './user';
import {Home} from './home';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends BackendApplicationProxy {
    @provide() static Session = getSession(BackendApplicationProxy.Session);
    @provide() static User = getUser(BackendApplicationProxy.User);
    @provide() static Home = Home;

    @view() static Root() {
      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => <div>Page not found</div>
      });

      return (
        <div>
          <h1>RealWorld{this.Session.user ? ` (${this.Session.user.username})` : ''}</h1>
          {content}
        </div>
      );
    }
  }

  return Application;
};
