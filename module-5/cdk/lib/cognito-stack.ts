import cdk = require("@aws-cdk/core");
import cognito = require("@aws-cdk/aws-cognito");

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'MysfitsUserPool',
      autoVerifiedAttributes: [
        cognito.UserPoolAttribute.EMAIL
      ]
    })

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'MysfitsUserPoolClient'
    })
  }
}