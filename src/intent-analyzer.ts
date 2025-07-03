import { gemini15Flash } from '@genkit-ai/googleai';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { 
  ProductDiscoverySchema, 
  ClarificationQuestionSchema,
  ConversationContextSchema,
  type ProductDiscovery,
  type ClarificationQuestion,
  type ConversationContext
} from './schemas.js';
import { createContextExtractionFlow, createBusinessIntelligenceFlow } from './context-intelligence.js';
import { createAmbiguityDetectionFlow, createClarificationGenerationFlow } from './ambiguity-detector.js';

// Flows will be initialized lazily
let contextExtractionFlow: any;
let businessIntelligenceFlow: any;
let ambiguityDetectionFlow: any;
let clarificationGenerationFlow: any;

function initializeFlows() {
  if (!contextExtractionFlow) {
    contextExtractionFlow = createContextExtractionFlow();
    businessIntelligenceFlow = createBusinessIntelligenceFlow();
    ambiguityDetectionFlow = createAmbiguityDetectionFlow();
    clarificationGenerationFlow = createClarificationGenerationFlow();
  }
}

// Enhanced Intent Analysis Flow
export const createIntentAnalysisFlow = () => defineFlow(
  {
    name: 'intentAnalysisFlow',
    inputSchema: z.object({
      query: z.string(),
      conversationContext: ConversationContextSchema.optional()
    }),
    outputSchema: z.object({
      understanding: ProductDiscoverySchema,
      contextAnalysis: z.any(),
      businessInsights: z.any(),
      ambiguityAnalysis: z.any(),
      needsClarification: z.boolean(),
      clarificationQuestions: z.array(ClarificationQuestionSchema),
      updatedContext: ConversationContextSchema
    })
  },
  async ({ query, conversationContext }) => {
    // Initialize flows if not already done
    initializeFlows();
    
    // Step 1: Basic intent analysis
    const intentAnalysisPrompt = definePrompt({
      name: 'intentAnalysisPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          query: z.string(),
          previousContext: z.string().optional(),
          conversationHistory: z.string().optional()
        })
      },
      output: {
        format: 'json',
        schema: ProductDiscoverySchema
      },
      prompt: `You are an expert promotional products advisor. Analyze this query to extract initial understanding.

Query: {{query}}
${conversationContext ? `Previous Context: {{previousContext}}` : ''}
${conversationContext?.clarificationHistory ? `Conversation History: {{conversationHistory}}` : ''}

Extract:
1. Primary intent and product requirements
2. Basic specifications (quantity, budget, timeline)
3. Any context clues about industry, event, recipients
4. Initial confidence in understanding

Be conservative with confidence scores - mark anything unclear as requiring clarification.`
    });

    const previousContext = conversationContext ? 
      JSON.stringify(conversationContext.currentUnderstanding, null, 2) : '';
    
    const conversationHistory = conversationContext?.clarificationHistory ? 
      conversationContext.clarificationHistory
        .map(h => `Q: ${h.question}\nA: ${h.answer}`)
        .join('\n---\n') : '';

    // Get initial understanding
    const analysisResponse = await intentAnalysisPrompt({
      input: { query, previousContext, conversationHistory }
    });
    
    const basicUnderstanding = analysisResponse.output;

    // Step 2: Extract detailed context
    const contextAnalysis = await contextExtractionFlow({
      query,
      previousContext: conversationContext?.currentUnderstanding
    });

    // Step 3: Detect ambiguities
    const ambiguityAnalysis = await ambiguityDetectionFlow({
      query,
      extractedData: basicUnderstanding,
      conversationHistory: conversationContext?.clarificationHistory?.map(h => h.answer) || []
    });

    // Step 4: Enhance understanding with context and ambiguity insights
    const enhancedUnderstandingPrompt = definePrompt({
      name: 'enhancedUnderstandingPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          basicUnderstanding: z.string(),
          contextAnalysis: z.string(),
          ambiguityAnalysis: z.string()
        })
      },
      output: {
        format: 'json',
        schema: ProductDiscoverySchema
      },
      prompt: `Enhance the understanding by integrating context analysis and ambiguity detection.

Basic Understanding: {{basicUnderstanding}}
Context Analysis: {{contextAnalysis}}
Ambiguity Analysis: {{ambiguityAnalysis}}

Create an enhanced understanding that:
1. Incorporates industry and event context insights
2. Includes all detected ambiguities
3. Updates confidence scores based on ambiguity analysis
4. Refines product categorization based on context
5. Adjusts timeline and budget interpretations based on industry patterns

The ambiguities array should include all detected ambiguities from the analysis.
Confidence scores should reflect the overall ambiguity score and context clarity.`
    });

    const enhancedResponse = await enhancedUnderstandingPrompt({
      input: {
        basicUnderstanding: JSON.stringify(basicUnderstanding, null, 2),
        contextAnalysis: JSON.stringify(contextAnalysis, null, 2),
        ambiguityAnalysis: JSON.stringify(ambiguityAnalysis, null, 2)
      }
    });

    const enhancedUnderstanding = enhancedResponse.output;

    // Step 5: Generate business insights
    const businessInsights = await businessIntelligenceFlow({
      understanding: enhancedUnderstanding,
      contextAnalysis
    });

    // Step 6: Determine if clarification is needed
    const needsClarification = ambiguityAnalysis.overallAmbiguityScore > 0.3 || 
                              enhancedUnderstanding.confidence.overall < 0.7;

    // Step 7: Generate smart clarification questions if needed
    let clarificationQuestions: ClarificationQuestion[] = [];
    
    if (needsClarification) {
      clarificationQuestions = await clarificationGenerationFlow({
        ambiguities: ambiguityAnalysis.detectedAmbiguities,
        contextAnalysis,
        conversationState: conversationContext?.conversationState || 'discovery',
        maxQuestions: 3
      });
    }

    // Step 8: Update conversation context
    const updatedContext: ConversationContext = {
      conversationId: conversationContext?.conversationId || `conv_${Date.now()}`,
      turnNumber: (conversationContext?.turnNumber || 0) + 1,
      previousContext: conversationContext?.currentUnderstanding,
      currentUnderstanding: enhancedUnderstanding,
      clarificationHistory: conversationContext?.clarificationHistory || [],
      userPreferences: conversationContext?.userPreferences || {},
      conversationState: needsClarification ? 'clarification' : 'confirmation'
    };

    return {
      understanding: enhancedUnderstanding,
      contextAnalysis,
      businessInsights,
      ambiguityAnalysis,
      needsClarification,
      clarificationQuestions,
      updatedContext
    };
  }
);

// Clarification Processing Flow
export const createClarificationProcessingFlow = () => defineFlow(
  {
    name: 'clarificationProcessingFlow',
    inputSchema: z.object({
      clarificationAnswer: z.string(),
      questionAsked: z.string(),
      conversationContext: ConversationContextSchema
    }),
    outputSchema: z.object({
      updatedUnderstanding: ProductDiscoverySchema,
      needsMoreClarification: z.boolean(),
      nextQuestions: z.array(ClarificationQuestionSchema),
      updatedContext: ConversationContextSchema
    })
  },
  async ({ clarificationAnswer, questionAsked, conversationContext }) => {
    const clarificationIntegrationPrompt = definePrompt({
      name: 'clarificationIntegrationPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          currentUnderstanding: z.string(),
          question: z.string(),
          answer: z.string(),
          previousClarifications: z.string()
        })
      },
      output: {
        format: 'json',
        schema: ProductDiscoverySchema
      },
      prompt: `Update the understanding based on the clarification answer.

Current Understanding: {{currentUnderstanding}}
Question Asked: {{question}}
User Answer: {{answer}}
Previous Clarifications: {{previousClarifications}}

Instructions:
1. Integrate the new information into the current understanding
2. Update confidence scores based on resolved ambiguities
3. Remove resolved ambiguities from the ambiguities array
4. Add any new ambiguities that emerged from the answer
5. Update all relevant fields (product specs, context, timeline, etc.)

Provide the updated understanding with improved confidence scores.`
    });

    const integrationResponse = await clarificationIntegrationPrompt({
      input: {
        currentUnderstanding: JSON.stringify(conversationContext.currentUnderstanding, null, 2),
        question: questionAsked,
        answer: clarificationAnswer,
        previousClarifications: conversationContext.clarificationHistory
          .map(h => `Q: ${h.question}\nA: ${h.answer}`)
          .join('\n')
      }
    });

    const updatedUnderstanding = integrationResponse.output;
    
    // Check if more clarification is needed
    const needsMoreClarification = updatedUnderstanding.ambiguities.length > 0 || 
                                  updatedUnderstanding.confidence.overall < 0.8;

    // Generate next questions if needed
    let nextQuestions: ClarificationQuestion[] = [];
    if (needsMoreClarification) {
      // Use the same clarification generation logic as before
      // ... (similar to intentAnalysisFlow)
    }

    // Update conversation context
    const updatedContext: ConversationContext = {
      ...conversationContext,
      turnNumber: conversationContext.turnNumber + 1,
      previousContext: conversationContext.currentUnderstanding,
      currentUnderstanding: updatedUnderstanding,
      clarificationHistory: [
        ...conversationContext.clarificationHistory,
        {
          question: questionAsked,
          answer: clarificationAnswer,
          resolvedAmbiguity: undefined // Could be determined by comparing before/after ambiguities
        }
      ],
      conversationState: needsMoreClarification ? 'clarification' : 'confirmation'
    };

    return {
      updatedUnderstanding,
      needsMoreClarification,
      nextQuestions,
      updatedContext
    };
  }
);