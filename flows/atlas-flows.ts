import { defineFlow, definePrompt, genkit } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/googleai';
import { z } from 'zod';

// Simple test flow
export const testFlow = defineFlow(
  {
    name: 'testFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      message: z.string(),
      timestamp: z.string()
    })
  },
  async (input) => {
    return {
      message: `Hello from Atlas! You said: "${input}"`,
      timestamp: new Date().toISOString()
    };
  }
);

// Main Atlas conversation flow - demonstrates core capabilities
export const atlasConversationFlow = defineFlow(
  {
    name: 'atlasConversationFlow',
    inputSchema: z.object({
      message: z.string(),
      conversationHistory: z.array(z.string()).optional()
    }),
    outputSchema: z.object({
      response: z.string(),
      analysis: z.object({
        intent: z.string(),
        productType: z.string().optional(),
        displayPreference: z.string().optional(),
        industryContext: z.string().optional(),
        ambiguities: z.array(z.string()),
        confidence: z.number()
      }),
      needsClarification: z.boolean(),
      clarificationQuestions: z.array(z.string()).optional()
    })
  },
  async ({ message, conversationHistory }) => {
    const conversationPrompt = definePrompt({
      name: 'atlasConversationPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          message: z.string(),
          history: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          response: z.string(),
          analysis: z.object({
            intent: z.string(),
            productType: z.string().optional(),
            displayPreference: z.string().optional(),
            industryContext: z.string().optional(),
            ambiguities: z.array(z.string()),
            confidence: z.number()
          }),
          needsClarification: z.boolean(),
          clarificationQuestions: z.array(z.string()).optional()
        })
      },
      prompt: `You are Atlas, a conversational AI assistant specializing in promotional products.

Your key capabilities:
1. **Semantic Understanding**: Separate product entities from display preferences
2. **Ambiguity Detection**: Identify unclear requirements that need clarification  
3. **Industry Context**: Understand business context and industry patterns
4. **Professional Consultation**: Provide expert guidance like a seasoned promotional products advisor

User Message: {{message}}
Conversation History: {{history}}

🔑 KEY EXAMPLE: "show me bags with images" → productType: "bags", displayPreference: "with images"
This demonstrates separating WHAT they want (bags) from HOW they want to see it (with images).

Common Ambiguity Patterns to Detect:
- Product category unclear ("something", "items", "products")
- Quantity scope unclear ("some", "a few", "several") 
- Quantity scope unclear ("some", "a few", "several") 
- Budget interpretation unclear ("under $20" - per item or total?)
- Quality expectations unclear ("nice", "premium", "good quality")
- Timeline unclear ("soon", "ASAP", "next month")
- Recipient unclear ("team", "employees", "clients")
- Customization unclear ("with logo", "branded", "custom")

Industry Context Clues:
- Technology: high-tech, modern designs, medium-high budget
- Healthcare: professional, clean, safety-focused
- Finance: premium, sophisticated, executive-level
- Education: practical, cost-effective, durable
- Non-profit: meaningful, sustainable, budget-conscious

Return JSON with:
- response: Professional, helpful response acknowledging understanding
- analysis: Detailed breakdown including separated product vs display preferences
- needsClarification: true if important details unclear
- clarificationQuestions: Specific questions to resolve ambiguities

Focus on being a knowledgeable promotional products consultant who understands both the products AND how clients want to interact with information.`
    });

    const history = conversationHistory ? conversationHistory.join('\n') : 'No previous conversation';
    const result = await conversationPrompt.run({ input: { message, history } });
    return result.output()!;
  }
);

// Product Discovery Flow - focused on entity separation
export const productDiscoveryFlow = defineFlow(
  {
    name: 'productDiscoveryFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      productType: z.string(),
      displayPreference: z.string().optional(),
      attributes: z.record(z.string()),
      understanding: z.string(),
      confidence: z.number()
    })
  },
  async (query) => {
    const discoveryPrompt = definePrompt({
      name: 'productDiscoveryPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({ query: z.string() })
      },
      output: {
        format: 'json',
        schema: z.object({
          productType: z.string(),
          displayPreference: z.string().optional(),
          attributes: z.record(z.string()),
          understanding: z.string(),
          confidence: z.number()
        })
      },
      prompt: `Extract and separate product information from promotional product queries.

🎯 CORE TASK: Separate WHAT they want (product) from HOW they want to see it (display preference).

Query: {{query}}

Examples of proper separation:
- "show me bags with images" → productType: "bags", displayPreference: "with images"
- "I need polo shirts" → productType: "polo shirts", displayPreference: undefined
- "display corporate gifts in a grid" → productType: "corporate gifts", displayPreference: "in a grid"

Extract:
- productType: The actual promotional product they want
- displayPreference: How they want to view/interact with results (optional)
- attributes: Any product specifications (color, size, material, etc.)
- understanding: Summary of what you extracted
- confidence: 0.0-1.0 confidence in your understanding`
    });

    const result = await discoveryPrompt.run({ input: { query } });
    return result.output()!;
  }
);
