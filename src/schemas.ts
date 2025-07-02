import { z } from 'zod';

// Intent Classification Schema
export const IntentTypeSchema = z.enum([
  'product_search',
  'specification_inquiry', 
  'budget_discussion',
  'timeline_planning',
  'comparison_request',
  'customization_details',
  'order_process',
  'general_question'
]);

// Context Classification Schema
export const IndustryContextSchema = z.enum([
  'technology',
  'healthcare',
  'finance',
  'education',
  'non_profit',
  'retail',
  'manufacturing',
  'hospitality',
  'legal',
  'creative_agency',
  'construction',
  'automotive',
  'real_estate',
  'unknown'
]);

export const EventTypeSchema = z.enum([
  'trade_show',
  'conference',
  'employee_onboarding',
  'client_appreciation',
  'product_launch',
  'company_anniversary',
  'holiday_gifts',
  'fundraising',
  'recruitment',
  'brand_awareness',
  'unknown'
]);

export const RecipientTypeSchema = z.enum([
  'employees',
  'clients',
  'prospects',
  'event_attendees',
  'general_public',
  'partners',
  'vendors',
  'unknown'
]);

// Ambiguity Detection Schema
export const AmbiguityTypeSchema = z.enum([
  'product_category',
  'quantity_scope',
  'budget_interpretation',
  'timeline_urgency',
  'quality_expectation',
  'customization_extent',
  'recipient_specification',
  'none'
]);

// Enhanced Product Discovery Schema
export const ProductDiscoverySchema = z.object({
  // Primary Intent
  primaryIntent: IntentTypeSchema.describe('The main intent of the user query'),
  
  // Product Information
  productType: z.string().optional().describe('Specific product type mentioned'),
  productCategories: z.array(z.string()).describe('Broader product categories that might match'),
  
  // Context Information
  industryContext: IndustryContextSchema.describe('Industry context of the client'),
  eventType: EventTypeSchema.describe('Type of event or use case'),
  recipientType: RecipientTypeSchema.describe('Who will receive the products'),
  
  // Specifications
  attributes: z.record(z.string()).describe('Product attributes like color, material, size'),
  quantity: z.number().optional().describe('Number of items needed'),
  budget: z.object({
    amount: z.number().optional(),
    perItem: z.boolean().default(false),
    currency: z.string().default('USD'),
    isApproximate: z.boolean().default(true)
  }).optional().describe('Budget constraints'),
  
  timeline: z.object({
    deadline: z.string().optional(),
    urgency: z.enum(['rush', 'standard', 'flexible']).default('standard'),
    isFlexible: z.boolean().default(true)
  }).optional().describe('Timeline requirements'),
  
  // Ambiguity Detection
  ambiguities: z.array(z.object({
    type: AmbiguityTypeSchema,
    description: z.string(),
    possibleInterpretations: z.array(z.string())
  })).describe('Detected ambiguities that need clarification'),
  
  // Confidence Scoring
  confidence: z.object({
    overall: z.number().min(0).max(1).describe('Overall confidence in understanding'),
    intent: z.number().min(0).max(1).describe('Confidence in intent classification'),
    context: z.number().min(0).max(1).describe('Confidence in context understanding'),
    specifications: z.number().min(0).max(1).describe('Confidence in product specifications')
  }).describe('Confidence scores for different aspects of understanding')
});

// Clarification Question Schema
export const ClarificationQuestionSchema = z.object({
  question: z.string().describe('The clarifying question to ask'),
  type: z.enum(['open_ended', 'multiple_choice', 'yes_no', 'range']).describe('Type of question'),
  options: z.array(z.string()).optional().describe('Options for multiple choice questions'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority of this clarification'),
  reasoning: z.string().describe('Why this clarification is needed')
});

// Conversation Context Schema
export const ConversationContextSchema = z.object({
  conversationId: z.string(),
  turnNumber: z.number(),
  previousContext: z.any().optional().describe('Context from previous turns'),
  currentUnderstanding: ProductDiscoverySchema,
  clarificationHistory: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    resolvedAmbiguity: AmbiguityTypeSchema.optional()
  })),
  userPreferences: z.record(z.any()).optional().describe('Learned user preferences'),
  conversationState: z.enum(['discovery', 'clarification', 'confirmation', 'specification']).describe('Current state of conversation')
});

export type IntentType = z.infer<typeof IntentTypeSchema>;
export type IndustryContext = z.infer<typeof IndustryContextSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type RecipientType = z.infer<typeof RecipientTypeSchema>;
export type AmbiguityType = z.infer<typeof AmbiguityTypeSchema>;
export type ProductDiscovery = z.infer<typeof ProductDiscoverySchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;