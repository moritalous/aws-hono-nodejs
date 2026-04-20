import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import type { Context } from 'hono'

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  credentialProvider: fromNodeProviderChain(),
})

const MODEL_ID = 'global.anthropic.claude-haiku-4-5-20251001-v1:0'

export const POST = async (c: Context) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json()

  const result = streamText({
    model: bedrock(MODEL_ID),
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
