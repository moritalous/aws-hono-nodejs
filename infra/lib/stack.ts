import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import {
  HttpApi,
  HttpMethod,
  HttpIntegrationType,
  HttpRouteIntegration,
  HttpRouteIntegrationBindOptions,
  HttpRouteIntegrationConfig,
  PayloadFormatVersion,
  CorsHttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2'
import { Construct } from 'constructs'
import * as path from 'path'

/**
 * Minimal Lambda proxy integration for API Gateway HTTP API.
 * Equivalent to HttpLambdaIntegration from the alpha package, implemented
 * inline to avoid the alpha dependency.
 */
class HttpLambdaProxyIntegration extends HttpRouteIntegration {
  constructor(id: string, private readonly fn: lambda.IFunction) {
    super(id)
  }

  bind(_options: HttpRouteIntegrationBindOptions): HttpRouteIntegrationConfig {
    return {
      type: HttpIntegrationType.AWS_PROXY,
      uri: this.fn.functionArn,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
    }
  }
}

export class AwsHonoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ── Lambda API (streaming) ────────────────────────────────────────────────
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `${id}-api`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      // Pre-built by: bun run build:backend  →  backend/dist/lambda.js
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        // CORS not required in production: frontend and API share the same CloudFront domain.
        CORS_ORIGIN: '*',
      },
    })

    // Allow Lambda to call Bedrock
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      }),
    )

    // ── API Gateway HTTP API ──────────────────────────────────────────────────
    // API Gateway HTTP API supports Lambda response streaming.
    // Uses streamHandle (hono/aws-lambda) on the Lambda side for chunked streaming.
    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `${id}-http-api`,
      // CORS handled by Hono middleware in local dev; not needed in production
      // (same CloudFront domain). Kept here for direct API testing convenience.
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    })

    // Grant API Gateway permission to invoke the Lambda function
    apiFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'))

    const integration = new HttpLambdaProxyIntegration('LambdaIntegration', apiFunction)

    // Route all /api/* and /api requests to Lambda
    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    })
    httpApi.addRoutes({
      path: '/api',
      methods: [HttpMethod.ANY],
      integration,
    })

    // API Gateway HTTP API endpoint hostname (no https:// prefix)
    const apiHostname = cdk.Fn.select(2, cdk.Fn.split('/', httpApi.apiEndpoint))

    // ── S3 bucket for frontend static files ──────────────────────────────────
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // ── CloudFront distribution ───────────────────────────────────────────────
    // Disable caching for API responses; streaming must not be buffered
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `${id}-api-no-cache`,
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: false,
      enableAcceptEncodingBrotli: false,
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        // S3 origin with OAC (modern replacement for OAI)
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        // All /api/* requests forwarded to API Gateway HTTP API
        '/api/*': {
          origin: new origins.HttpOrigin(apiHostname, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: apiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          // Forward all headers/query strings except Host
          // (API Gateway requires its own Host header)
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: false,
        },
      },
      defaultRootObject: 'index.html',
      // SPA fallback: return index.html for 403/404 so client-side routing works
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    })

    // Deploy frontend build output to S3 and invalidate CloudFront cache
    // Pre-built by: bun run build:frontend  →  frontend/out/
    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/out'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    })

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL (use this as your app URL)',
    })

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway HTTP API URL (accessed via CloudFront /api/*)',
    })

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket name for frontend static files',
    })
  }
}
