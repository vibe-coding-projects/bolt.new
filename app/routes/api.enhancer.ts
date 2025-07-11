import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { parseDataStreamPart } from 'ai';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message } = await request.json<{ message: string }>();

  try {
    const result = streamText(
      [
        {
          id: Date.now().toString(),
          role: 'user',
          content: stripIndents`
            I want you to improve the user prompt that is wrapped in <original_prompt> tags.

            IMPORTANT: Only respond with the improved prompt and nothing else!

            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      context.cloudflare.env,
    );

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const processedChunk = decoder
          .decode(chunk)
          .split('\n')
          .filter((line) => line !== '')
          .map(parseDataStreamPart)
          .map((part) => part.value)
          .join('');

        controller.enqueue(encoder.encode(processedChunk));
      },
    });

    const transformedStream = result.toDataStream().pipeThrough(transformStream);

    return new Response(transformedStream, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
