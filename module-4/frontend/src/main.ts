import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';

Amplify.configure({
  Auth: {
    identityPoolId: aws_exports.aws_cognito_identity_pool_id,
    region: aws_exports.aws_project_region,
    userPoolId: aws_exports.aws_user_pools_id,
    userPoolWebClientId: aws_exports.aws_user_pools_web_client_id,
  },
  API: {
    endpoints: [
      {
        name: "mm-api",
        endpoint: environment.mysfitsApiUrl,
        custom_header: async () => {
          return { Authorization: (await Amplify.Auth.currentSession()).idToken.jwtToken } 
        }
      }
    ]
  }
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
