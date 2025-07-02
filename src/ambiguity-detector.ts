import { gemini15Flash } from '@genkit-ai/googleai';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { AmbiguityTypeSchema, ClarificationQuestionSchema } from './schemas.js';

// Common ambiguity patterns in promotional products industry
export const AMBIGUITY_PATTERNS = {
  product_category: {
    triggers: ['something', 'items', 'products', 'things', 'stuff', 'branded merchandise'],
    examples: ['something for employees', 'branded items', 'corporate gifts'],
    clarificationApproach: 'Ask about specific product types or use cases'
  },
  quantity_scope: {
    triggers: ['some', 'a few', 'several', 'bunch', 'lot'],
    examples: ['a few shirts', 'some bags for the team', 'several items'],
    clarificationApproach: 'Ask for specific quantities or ranges'
  },
  budget_interpretation: {
    triggers: ['affordable', 'cheap', 'expensive', 'premium', 'budget-friendly', 'cost-effective'],
    examples: ['affordable polo shirts', 'premium gifts under $50', 'budget promotional items'],
    clarificationApproach: 'Ask for specific budget ranges per item or total'
  },
  timeline_urgency: {
    triggers: ['soon', 'quickly', 'asap', 'rush', 'urgent', 'next week', 'by'],
    examples: ['need them soon', 'rush order', 'by next month'],
    clarificationApproach: 'Ask for specific dates and timeline flexibility'
  },
  quality_expectation: {
    triggers: ['nice', 'good', 'quality', 'professional', 'high-end', 'decent'],
    examples: ['nice polo shirts', 'good quality bags', 'professional looking'],
    clarificationApproach: 'Ask about specific quality attributes or price ranges'
  },
  customization_extent: {
    triggers: ['custom', 'branded', 'with logo', 'personalized', 'customized'],
    examples: ['custom shirts with logo', 'branded merchandise', 'personalized gifts'],
    clarificationApproach: 'Ask about logo specifications, placement, techniques'
  },
  recipient_specification: {
    triggers: ['team', 'employees', 'staff', 'clients', 'customers', 'people'],
    examples: ['for the team', 'employee gifts', 'client appreciation'],
    clarificationApproach: 'Ask about specific recipient groups and their preferences'
  }
} as const;

// Advanced Ambiguity Detection Flow
export const ambiguityDetectionFlow = defineFlow(
  {
    name: 'ambiguityDetectionFlow',
    inputSchema: z.object({
      query: z.string(),
      extractedData: z.any(), // Current understanding
      conversationHistory: z.array(z.string()).optional()
    }),
    outputSchema: z.object({
      detectedAmbiguities: z.array(z.object({
        type: AmbiguityTypeSchema,
        description: z.string(),
        possibleInterpretations: z.array(z.string()),
        confidence: z.number(),
        impact: z.enum(['high', 'medium', 'low']),
        evidenceFromQuery: z.array(z.string())
      })),
      clarificationPriority: z.array(z.object({
        ambiguityType: AmbiguityTypeSchema,
        priority: z.number(),
        reasoning: z.string()
      })),
      overallAmbiguityScore: z.number()
    })
  },
  async ({ query, extractedData, conversationHistory }) => {
    const ambiguityAnalysisPrompt = definePrompt({
      name: 'ambiguityAnalysisPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          userQuery: z.string(),
          currentUnderstanding: z.string(),
          ambiguityPatterns: z.string(),
          conversationContext: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          ambiguities: z.array(z.object({
            type: AmbiguityTypeSchema,
            description: z.string(),
            possibleInterpretations: z.array(z.string()),
            confidence: z.number(),
            impact: z.enum(['high', 'medium', 'low']),
            evidenceFromQuery: z.array(z.string()),
            resolutionUrgency: z.enum(['critical', 'important', 'helpful'])
          })),
          missingCriticalInfo: z.array(z.string()),
          assumptionsMade: z.array(z.object({
            assumption: z.string(),
            confidence: z.number(),
            shouldVerify: z.boolean()
          }))
        })
      },
      prompt: `You are an expert at detecting ambiguities and misunderstandings in promotional products requests.

CRITICAL TASK: Identify ALL potential ambiguities that could lead to wrong product recommendations.

User Query: {{userQuery}}
Current Understanding: {{currentUnderstanding}}
Ambiguity Patterns: {{ambiguityPatterns}}
Conversation History: {{conversationContext}}

Common promotional products ambiguities to detect:

1. **Product Category Ambiguity**:
   - Vague terms: "something", "items", "products", "things"
   - Multiple interpretations: "corporate gifts" could be executive gifts, employee appreciation, client thank-you items

2. **Quantity Scope Ambiguity**:
   - Unclear numbers: "some", "a few", "several", "bunch"
   - Scale confusion: "for the office" (5 people vs 500 people?)

3. **Budget Interpretation Ambiguity**:
   - Relative terms: "affordable", "premium", "budget-friendly"
   - Scope confusion: "$20 budget" per item or total?
   - Currency and regional differences

4. **Timeline Urgency Ambiguity**:
   - Vague timing: "soon", "ASAP", "next month"
   - Flexibility unclear: hard deadline vs preferred timing?
   - Production time misconceptions

5. **Quality Expectation Ambiguity**:
   - Subjective terms: "nice", "good quality", "professional"
   - Industry context: "premium" for non-profit vs tech company
   - Use case impact: trade show giveaway vs executive gift

6. **Customization Extent Ambiguity**:
   - Logo specifications: size, placement, colors, technique
   - "Custom" could mean: logo only, full custom design, color matching
   - Approval process and timeline implications

7. **Recipient Specification Ambiguity**:
   - Group definition: "team" size, roles, preferences
   - Appropriateness: what's suitable for specific recipients?
   - Distribution logistics

For each ambiguity found:
- Specify the type from the enum
- Describe exactly what's unclear
- List possible interpretations
- Rate confidence in detection (0.0-1.0)
- Assess impact on product selection (high/medium/low)
- Cite specific words/phrases as evidence
- Rate urgency of resolution

Also identify:
- Critical missing information
- Assumptions being made (and whether they should be verified)

Be thorough - it's better to over-identify potential ambiguities than miss important ones.`
    });

    const ambiguityResponse = await ambiguityAnalysisPrompt({
      input: {
        userQuery: query,
        currentUnderstanding: JSON.stringify(extractedData, null, 2),
        ambiguityPatterns: JSON.stringify(AMBIGUITY_PATTERNS, null, 2),
        conversationContext: conversationHistory ? conversationHistory.join('\n') : 'None'
      }
    });

    const analysis = ambiguityResponse.output;

    // Calculate clarification priority
    const clarificationPriority = analysis.ambiguities
      .map(amb => ({
        ambiguityType: amb.type,
        priority: calculatePriority(amb),
        reasoning: `${amb.impact} impact ambiguity with ${amb.confidence} confidence. ${amb.resolutionUrgency} to resolve.`
      }))
      .sort((a, b) => b.priority - a.priority);

    // Calculate overall ambiguity score
    const overallAmbiguityScore = calculateOverallAmbiguityScore(analysis.ambiguities);

    return {
      detectedAmbiguities: analysis.ambiguities.map(amb => ({
        type: amb.type,
        description: amb.description,
        possibleInterpretations: amb.possibleInterpretations,
        confidence: amb.confidence,
        impact: amb.impact,
        evidenceFromQuery: amb.evidenceFromQuery
      })),
      clarificationPriority,
      overallAmbiguityScore
    };
  }
);

// Smart Clarification Question Generation Flow
export const clarificationGenerationFlow = defineFlow(
  {
    name: 'clarificationGenerationFlow',
    inputSchema: z.object({
      ambiguities: z.array(z.any()),
      contextAnalysis: z.any(),
      conversationState: z.string(),
      maxQuestions: z.number().default(3)
    }),
    outputSchema: z.array(ClarificationQuestionSchema)
  },
  async ({ ambiguities, contextAnalysis, conversationState, maxQuestions }) => {
    const clarificationPrompt = definePrompt({
      name: 'smartClarificationPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          ambiguitiesData: z.string(),
          context: z.string(),
          state: z.string(),
          maxQuestions: z.number()
        })
      },
      output: {
        format: 'json',
        schema: z.array(ClarificationQuestionSchema)
      },
      prompt: `Generate smart clarification questions for promotional products consultation.

Ambiguities to Address: {{ambiguitiesData}}
Context Analysis: {{context}}
Conversation State: {{state}}
Maximum Questions: {{maxQuestions}}

Guidelines for excellent clarification questions:

1. **Prioritize Impact**: Address high-impact ambiguities first
2. **Industry Context**: Use promotional products terminology appropriately
3. **Multiple Choice When Helpful**: Offer options to speed up responses
4. **Explain Why**: Briefly explain why the information matters
5. **Professional Tone**: Maintain consultant-level expertise
6. **Avoid Overwhelm**: Don't ask too many questions at once

Question Types:
- **Open-ended**: For complex requirements that need explanation
- **Multiple choice**: For categorical decisions (product types, budgets)
- **Yes/no**: For confirming assumptions or binary choices
- **Range**: For quantities, budgets, timelines

Example good questions:
- "To help me find the perfect products, could you tell me approximately how many team members you're shopping for? This helps determine if we should look at bulk pricing options."
- "When you mention 'premium quality,' are you thinking: A) Executive gift level ($50+ per item), B) Professional quality ($15-30 per item), or C) Good promotional quality ($5-15 per item)?"
- "Is this for a specific event with a firm deadline, or more of an ongoing program where we have flexibility on timing?"

Generate {{maxQuestions}} or fewer questions that will resolve the most critical ambiguities efficiently.`
    });

    const questionsResponse = await clarificationPrompt({
      input: {
        ambiguitiesData: JSON.stringify(ambiguities, null, 2),
        context: JSON.stringify(contextAnalysis, null, 2),
        state: conversationState,
        maxQuestions
      }
    });

    return questionsResponse.output;
  }
);

// Helper functions
function calculatePriority(ambiguity: any): number {
  const impactWeight = { high: 3, medium: 2, low: 1 }[ambiguity.impact];
  const urgencyWeight = { critical: 3, important: 2, helpful: 1 }[ambiguity.resolutionUrgency];
  const confidenceWeight = ambiguity.confidence;
  
  return (impactWeight * urgencyWeight * confidenceWeight) * 10;
}

function calculateOverallAmbiguityScore(ambiguities: any[]): number {
  if (ambiguities.length === 0) return 0;
  
  const totalImpact = ambiguities.reduce((sum, amb) => {
    const weight = { high: 3, medium: 2, low: 1 }[amb.impact];
    return sum + (weight * amb.confidence);
  }, 0);
  
  const maxPossibleImpact = ambiguities.length * 3;
  return totalImpact / maxPossibleImpact;
}