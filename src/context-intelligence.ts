import { gemini15Flash } from '@genkit-ai/googleai';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { 
  IndustryContextSchema, 
  EventTypeSchema, 
  RecipientTypeSchema,
  type IndustryContext,
  type EventType,
  type RecipientType 
} from './schemas.js';

// Industry-specific interpretation patterns
export const INDUSTRY_PATTERNS = {
  technology: {
    keywords: ['tech', 'startup', 'software', 'IT', 'engineering', 'developer', 'innovation'],
    preferredProducts: ['tech accessories', 'branded apparel', 'desk items', 'power banks'],
    qualityExpectations: 'high-tech, modern, sleek designs',
    budgetRange: 'medium to high',
    commonUses: ['employee onboarding', 'conference swag', 'client gifts']
  },
  healthcare: {
    keywords: ['medical', 'hospital', 'clinic', 'healthcare', 'pharma', 'wellness'],
    preferredProducts: ['sanitizers', 'wellness items', 'professional apparel', 'safety items'],
    qualityExpectations: 'professional, clean, safety-focused',
    budgetRange: 'medium',
    commonUses: ['patient education', 'staff recognition', 'health awareness campaigns']
  },
  finance: {
    keywords: ['bank', 'finance', 'investment', 'insurance', 'accounting', 'consulting'],
    preferredProducts: ['executive gifts', 'professional accessories', 'desk items', 'portfolios'],
    qualityExpectations: 'premium, professional, sophisticated',
    budgetRange: 'medium to high',
    commonUses: ['client appreciation', 'executive gifts', 'conference materials']
  },
  education: {
    keywords: ['school', 'university', 'education', 'academy', 'learning', 'student'],
    preferredProducts: ['school supplies', 'bags', 'apparel', 'educational materials'],
    qualityExpectations: 'durable, practical, cost-effective',
    budgetRange: 'low to medium',
    commonUses: ['student recruitment', 'alumni events', 'fundraising']
  },
  non_profit: {
    keywords: ['nonprofit', 'charity', 'foundation', 'volunteer', 'community', 'social'],
    preferredProducts: ['awareness items', 'apparel', 'reusable items', 'eco-friendly products'],
    qualityExpectations: 'cost-effective, meaningful, sustainable',
    budgetRange: 'low',
    commonUses: ['awareness campaigns', 'fundraising events', 'volunteer appreciation']
  }
} as const;

// Event-specific context patterns
export const EVENT_PATTERNS = {
  trade_show: {
    keywords: ['trade show', 'expo', 'convention', 'booth', 'exhibition'],
    urgentNeed: true,
    quantityPattern: 'high volume',
    productTypes: ['giveaways', 'bags', 'apparel', 'tech accessories'],
    timeline: 'specific deadline',
    considerations: ['portability', 'eye-catching', 'brand visibility']
  },
  conference: {
    keywords: ['conference', 'summit', 'meeting', 'seminar', 'workshop'],
    urgentNeed: true,
    quantityPattern: 'medium to high volume',
    productTypes: ['bags', 'notebooks', 'pens', 'tech items'],
    timeline: 'specific deadline',
    considerations: ['professional appearance', 'utility', 'networking value']
  },
  employee_onboarding: {
    keywords: ['onboarding', 'new hire', 'welcome', 'orientation'],
    urgentNeed: false,
    quantityPattern: 'ongoing small batches',
    productTypes: ['welcome kits', 'apparel', 'desk items', 'tech accessories'],
    timeline: 'ongoing need',
    considerations: ['quality impression', 'company culture', 'practicality']
  }
} as const;

// Context Extraction Flow
export const createContextExtractionFlow = () => defineFlow(
  {
    name: 'contextExtractionFlow',
    inputSchema: z.object({
      query: z.string(),
      previousContext: z.record(z.any()).optional()
    }),
    outputSchema: z.object({
      industryContext: z.object({
        detected: IndustryContextSchema,
        confidence: z.number(),
        indicators: z.array(z.string()),
        implications: z.object({
          qualityExpectations: z.string(),
          budgetRange: z.string(),
          preferredProducts: z.array(z.string()),
          commonUses: z.array(z.string())
        })
      }),
      eventContext: z.object({
        detected: EventTypeSchema,
        confidence: z.number(),
        indicators: z.array(z.string()),
        implications: z.object({
          urgentNeed: z.boolean(),
          quantityPattern: z.string(),
          productTypes: z.array(z.string()),
          timeline: z.string(),
          considerations: z.array(z.string())
        })
      }),
      recipientContext: z.object({
        detected: RecipientTypeSchema,
        confidence: z.number(),
        indicators: z.array(z.string()),
        implications: z.object({
          appropriateProducts: z.array(z.string()),
          qualityLevel: z.string(),
          personalization: z.string()
        })
      })
    })
  },
  async ({ query, previousContext }) => {
    const contextAnalysisPrompt = definePrompt({
      name: 'contextAnalysisPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          query: z.string(),
          industryPatterns: z.string(),
          eventPatterns: z.string(),
          previousContext: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          industryAnalysis: z.object({
            detected: IndustryContextSchema,
            confidence: z.number(),
            indicators: z.array(z.string()),
            reasoning: z.string()
          }),
          eventAnalysis: z.object({
            detected: EventTypeSchema,
            confidence: z.number(),
            indicators: z.array(z.string()),
            reasoning: z.string()
          }),
          recipientAnalysis: z.object({
            detected: RecipientTypeSchema,
            confidence: z.number(),
            indicators: z.array(z.string()),
            reasoning: z.string()
          })
        })
      },
      prompt: `Analyze the promotional products query to extract industry, event, and recipient context.

Query: {{query}}

Industry Patterns Reference: {{industryPatterns}}
Event Patterns Reference: {{eventPatterns}}
Previous Context: {{previousContext}}

Instructions:
1. **Industry Detection**: Look for company type, industry keywords, business context
2. **Event Detection**: Identify if this is for a specific event type or general use
3. **Recipient Detection**: Determine who will receive these products

For each context type:
- Choose the most likely category
- Provide confidence score (0.0-1.0)
- List specific indicators found in the query
- Explain your reasoning

Be conservative with confidence scores - if unclear, mark as 'unknown' with low confidence.`
    });

    const analysisResponse = await contextAnalysisPrompt({
      input: {
        query,
        industryPatterns: JSON.stringify(INDUSTRY_PATTERNS, null, 2),
        eventPatterns: JSON.stringify(EVENT_PATTERNS, null, 2),
        previousContext: previousContext ? JSON.stringify(previousContext, null, 2) : 'None'
      }
    });

    const analysis = analysisResponse.output;

    // Add implications based on detected context
    const industryImplications = analysis.industryAnalysis.detected !== 'unknown' 
      ? INDUSTRY_PATTERNS[analysis.industryAnalysis.detected as keyof typeof INDUSTRY_PATTERNS] 
      : {
          qualityExpectations: 'standard professional quality',
          budgetRange: 'medium',
          preferredProducts: ['general promotional items'],
          commonUses: ['general business promotion']
        };

    const eventImplications = analysis.eventAnalysis.detected !== 'unknown'
      ? EVENT_PATTERNS[analysis.eventAnalysis.detected as keyof typeof EVENT_PATTERNS]
      : {
          urgentNeed: false,
          quantityPattern: 'standard quantities',
          productTypes: ['general promotional items'],
          timeline: 'flexible',
          considerations: ['standard promotional considerations']
        };

    const recipientImplications = {
      employees: {
        appropriateProducts: ['apparel', 'desk items', 'tech accessories', 'recognition items'],
        qualityLevel: 'good to premium',
        personalization: 'company branding with possible individual names'
      },
      clients: {
        appropriateProducts: ['executive gifts', 'premium items', 'useful accessories'],
        qualityLevel: 'premium',
        personalization: 'subtle company branding, focus on quality'
      },
      prospects: {
        appropriateProducts: ['branded giveaways', 'useful items', 'memorable pieces'],
        qualityLevel: 'good',
        personalization: 'clear company branding and contact info'
      },
      event_attendees: {
        appropriateProducts: ['bags', 'giveaways', 'practical items', 'tech accessories'],
        qualityLevel: 'standard to good',
        personalization: 'event and company branding'
      }
    }[analysis.recipientAnalysis.detected] || {
      appropriateProducts: ['general promotional items'],
      qualityLevel: 'standard',
      personalization: 'company branding'
    };

    return {
      industryContext: {
        detected: analysis.industryAnalysis.detected,
        confidence: analysis.industryAnalysis.confidence,
        indicators: analysis.industryAnalysis.indicators,
        implications: {
          qualityExpectations: industryImplications.qualityExpectations,
          budgetRange: industryImplications.budgetRange,
          preferredProducts: industryImplications.preferredProducts,
          commonUses: industryImplications.commonUses
        }
      },
      eventContext: {
        detected: analysis.eventAnalysis.detected,
        confidence: analysis.eventAnalysis.confidence,
        indicators: analysis.eventAnalysis.indicators,
        implications: {
          urgentNeed: eventImplications.urgentNeed,
          quantityPattern: eventImplications.quantityPattern,
          productTypes: eventImplications.productTypes,
          timeline: eventImplications.timeline,
          considerations: eventImplications.considerations
        }
      },
      recipientContext: {
        detected: analysis.recipientAnalysis.detected,
        confidence: analysis.recipientAnalysis.confidence,
        indicators: analysis.recipientAnalysis.indicators,
        implications: recipientImplications
      }
    };
  }
);

// Business Intelligence Flow - provides strategic recommendations
export const createBusinessIntelligenceFlow = () => defineFlow(
  {
    name: 'businessIntelligenceFlow',
    inputSchema: z.object({
      understanding: z.any(), // ProductDiscovery schema
      contextAnalysis: z.any()
    }),
    outputSchema: z.object({
      strategicRecommendations: z.array(z.object({
        category: z.string(),
        recommendation: z.string(),
        reasoning: z.string(),
        priority: z.enum(['high', 'medium', 'low'])
      })),
      potentialConcerns: z.array(z.object({
        concern: z.string(),
        impact: z.string(),
        mitigation: z.string()
      })),
      opportunityInsights: z.array(z.object({
        opportunity: z.string(),
        description: z.string(),
        potentialValue: z.string()
      })),
      industryBestPractices: z.array(z.string())
    })
  },
  async ({ understanding, contextAnalysis }) => {
    const businessIntelligencePrompt = definePrompt({
      name: 'businessIntelligencePrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          productRequirements: z.string(),
          industryContext: z.string(),
          eventContext: z.string(),
          recipientContext: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          strategicRecommendations: z.array(z.object({
            category: z.string(),
            recommendation: z.string(),
            reasoning: z.string(),
            priority: z.enum(['high', 'medium', 'low'])
          })),
          potentialConcerns: z.array(z.object({
            concern: z.string(),
            impact: z.string(),
            mitigation: z.string()
          })),
          opportunityInsights: z.array(z.object({
            opportunity: z.string(),
            description: z.string(),
            potentialValue: z.string()
          })),
          industryBestPractices: z.array(z.string())
        })
      },
      prompt: `As a promotional products business strategist, analyze this request and provide strategic insights.

Product Requirements: {{productRequirements}}
Industry Context: {{industryContext}}
Event Context: {{eventContext}}
Recipient Context: {{recipientContext}}

Provide:
1. **Strategic Recommendations**: Business-focused suggestions for product selection, branding, timing
2. **Potential Concerns**: Issues that might arise and how to address them
3. **Opportunity Insights**: Ways to maximize impact and value
4. **Industry Best Practices**: Relevant practices for this industry/use case

Focus on business value, ROI, brand impact, and practical considerations.`
    });

    const intelligenceResponse = await businessIntelligencePrompt({
      input: {
        productRequirements: JSON.stringify(understanding, null, 2),
        industryContext: JSON.stringify(contextAnalysis.industryContext, null, 2),
        eventContext: JSON.stringify(contextAnalysis.eventContext, null, 2),
        recipientContext: JSON.stringify(contextAnalysis.recipientContext, null, 2)
      }
    });

    return intelligenceResponse.output;
  }
);