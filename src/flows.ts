import { gemini15Flash } from '@genkit-ai/googleai';
import { ai, flow } from 'genkit';
import { z } from 'zod';

// Define the schema for the product discovery output
const ProductDiscoveryOutputSchema = z.object({
  productType: z.string().describe('The type of product the user is looking for (e.g., "polo shirts", "bags").'),
  attributes: z.record(z.string()).describe('A map of product attributes like color, material, etc.'),
  quantity: z.number().optional().describe('The number of items the user needs.'),
  industry: z.string().optional().describe('The industry the client belongs to.'),
  deadline: z.string().optional().describe('The deadline for the order.'),
});

// Define the product discovery flow
export const productDiscoveryFlow = flow(
  {
    name: 'productDiscoveryFlow',
    inputSchema: z.string(),
    outputSchema: ProductDiscoveryOutputSchema,
  },
  async (query) => {
    // Define the prompt inside the flow to ensure genkit is initialized
    const productExtractionPrompt = ai.definePrompt({
        name: 'productExtractionPrompt',
        model: gemini15Flash,
        input: {
          schema: z.object({
            query: z.string(),
          }),
        },
        output: {
          format: 'json',
          schema: ProductDiscoveryOutputSchema,
        },
        prompt: `You are an expert at understanding promotional product requests.
          Extract the product information from the following user query.
          Separate the product type, attributes (like color, material, price), quantity, client industry, and deadline.

          Query: {{query}}
          `,
      });

    const llmResponse = await productExtractionPrompt({
        input: { query },
    });

    return llmResponse.output;
  }
);
