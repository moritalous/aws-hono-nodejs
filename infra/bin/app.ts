#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { AwsHonoStack } from '../lib/stack'

const app = new cdk.App()

new AwsHonoStack(app, 'AwsHonoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Hono API + Next.js frontend on AWS (Lambda streaming + CloudFront + S3)',
})
