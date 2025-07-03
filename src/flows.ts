import { gemini15Flash } from '@genkit-ai/googleai';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { createIntentAnalysisFlow, createClarificationProcessingFlow } from './intent-analyzer.js';
import { 
  ProductDiscoverySchema, 
  ConversationContextSchema,
  type ConversationContext 
} from './schemas.js';

// Initialize flows lazily
let intentAnalysisFlow: any;
let clarificationProcessingFlow: any;

function initializeAnalysisFlows() {
  if (!intentAnalysisFlow) {
    intentAnalysisFlow = createIntentAnalysisFlow();
    clarificationProcessingFlow = createClarificationProcessingFlow();
  }
}

// Legacy product discovery flow - kept for backward compatibility
const ProductDiscoveryOutputSchema = z.object({
  productType: z.string().describe('The type of product the user is looking for (e.g., "polo shirts", "bags").'),
  attributes: z.record(z.string()).describe('A map of product attributes like color, material, etc.'),
  quantity: z.number().optional().describe('The number of items the user needs.'),
  industry: z.string().optional().describe('The industry the client belongs to.'),
  deadline: z.string().optional().describe('The deadline for the order.'),
});

export const createProductDiscoveryFlow = () => defineFlow(
  {
    name: 'productDiscoveryFlow',
    inputSchema: z.string(),
    outputSchema: ProductDiscoveryOutputSchema,
  },
  async (query) => {
    const productExtractionPrompt = definePrompt({
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

// Main conversation flow - uses the new intent analysis system
export const createConversationFlow = () => defineFlow(
  {
    name: 'conversationFlow',
    inputSchema: z.object({
      message: z.string(),
      conversationContext: ConversationContextSchema.optional()
    }),
    outputSchema: z.object({
      response: z.string(),
      understanding: ProductDiscoverySchema,
      contextAnalysis: z.any(),
      businessInsights: z.any(),
      ambiguityAnalysis: z.any(),
      needsClarification: z.boolean(),
      clarificationQuestions: z.array(z.object({
        question: z.string(),
        type: z.enum(['open_ended', 'multiple_choice', 'yes_no', 'range']),
        options: z.array(z.string()).optional(),
        priority: z.enum(['high', 'medium', 'low']),
        reasoning: z.string()
      })),
      conversationContext: ConversationContextSchema,
      confidence: z.object({
        overall: z.number(),
        readyToRecommend: z.boolean()
      })
    })
  },
  async ({ message, conversationContext }) => {
    // Initialize analysis flows if not already done
    initializeAnalysisFlows();
    
    // Analyze the message using the intent analysis flow
    const analysisResult = await intentAnalysisFlow({
      query: message,
      conversationContext
    });

    // Generate appropriate response based on the analysis
    const responsePrompt = definePrompt({
      name: 'conversationResponsePrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          userMessage: z.string(),
          understanding: z.string(),
          needsClarification: z.boolean(),
          clarificationQuestions: z.string(),
          conversationState: z.string()
        })
      },
      output: {
        format: 'text'
      },
      prompt: `You are Atlas, a conversational AI assistant specializing in promotional products.

Your personality:
- Professional but friendly and approachable
- Expert in promotional products industry
- Patient and thorough in understanding client needs
- Proactive in identifying potential issues or opportunities

User Message: {{userMessage}}
Current Understanding: {{understanding}}
Needs Clarification: {{needsClarification}}
Clarification Questions: {{clarificationQuestions}}
Conversation State: {{conversationState}}

Generate a natural, helpful response that:
1. Acknowledges what you understood from their message
2. If clarification is needed, ask the clarifying questions naturally
3. If no clarification needed, summarize your understanding and ask for confirmation
4. Always maintain a professional but conversational tone
5. Show expertise in promotional products terminology

Keep responses concise but comprehensive. Don't overwhelm with too many questions at once.`
    });

    const responseResult = await responsePrompt({
      input: {
        userMessage: message,
        understanding: JSON.stringify(analysisResult.understanding, null, 2),
        needsClarification: analysisResult.needsClarification.toString(),
        clarificationQuestions: JSON.stringify(analysisResult.clarificationQuestions, null, 2),
        conversationState: analysisResult.updatedContext.conversationState
      }
    });

    return {
      response: responseResult.output,
      understanding: analysisResult.understanding,
      contextAnalysis: analysisResult.contextAnalysis,
      businessInsights: analysisResult.businessInsights,
      ambiguityAnalysis: analysisResult.ambiguityAnalysis,
      needsClarification: analysisResult.needsClarification,
      clarificationQuestions: analysisResult.clarificationQuestions,
      conversationContext: analysisResult.updatedContext,
      confidence: {
        overall: analysisResult.understanding.confidence.overall,
        readyToRecommend: analysisResult.understanding.confidence.overall > 0.8 && 
                         analysisResult.understanding.ambiguities.length === 0
      }
    };
  }
);

// Requirements gathering flow for multi-turn conversations
export const createRequirementsGatheringFlow = () => defineFlow(
  {
    name: 'requirementsGatheringFlow',
    inputSchema: z.object({
      clarificationAnswer: z.string(),
      questionAsked: z.string(),
      conversationContext: ConversationContextSchema
    }),
    outputSchema: z.object({
      response: z.string(),
      updatedUnderstanding: ProductDiscoverySchema,
      needsMoreClarification: z.boolean(),
      nextQuestions: z.array(z.object({
        question: z.string(),
        type: z.enum(['open_ended', 'multiple_choice', 'yes_no', 'range']),
        options: z.array(z.string()).optional(),
        priority: z.enum(['high', 'medium', 'low']),
        reasoning: z.string()
      })),
      conversationContext: ConversationContextSchema,
      readyForRecommendations: z.boolean()
    })
  },
  async ({ clarificationAnswer, questionAsked, conversationContext }) => {
    // Initialize analysis flows if not already done
    initializeAnalysisFlows();
    
    // Process the clarification using the clarification processing flow
    const clarificationResult = await clarificationProcessingFlow({
      clarificationAnswer,
      questionAsked,
      conversationContext
    });

    // Generate response acknowledging the clarification
    const responsePrompt = definePrompt({
      name: 'clarificationResponsePrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          userAnswer: z.string(),
          questionAsked: z.string(),
          updatedUnderstanding: z.string(),
          needsMore: z.boolean(),
          nextQuestions: z.string()
        })
      },
      output: {
        format: 'text'
      },
      prompt: `Generate a natural response that acknowledges the user's clarification and either asks follow-up questions or confirms readiness to proceed.

User's Answer: {{userAnswer}}
Question That Was Asked: {{questionAsked}}
Updated Understanding: {{updatedUnderstanding}}
Needs More Clarification: {{needsMore}}
Next Questions: {{nextQuestions}}

Response should:
1. Thank them for the clarification
2. Briefly confirm what you now understand
3. Either ask the next clarifying question(s) or confirm you're ready to help find products
4. Keep it conversational and professional`
    });

    const responseResult = await responsePrompt({
      input: {
        userAnswer: clarificationAnswer,
        questionAsked,
        updatedUnderstanding: JSON.stringify(clarificationResult.updatedUnderstanding, null, 2),
        needsMore: clarificationResult.needsMoreClarification,
        nextQuestions: JSON.stringify(clarificationResult.nextQuestions, null, 2)
      }
    });

    return {
      response: responseResult.output,
      updatedUnderstanding: clarificationResult.updatedUnderstanding,
      needsMoreClarification: clarificationResult.needsMoreClarification,
      nextQuestions: clarificationResult.nextQuestions,
      conversationContext: clarificationResult.updatedContext,
      readyForRecommendations: !clarificationResult.needsMoreClarification && 
                              clarificationResult.updatedUnderstanding.confidence.overall > 0.8
    };
  }
);
