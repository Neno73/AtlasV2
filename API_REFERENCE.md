# Atlas API Reference

## Main Flows

### conversationFlow

Main entry point for user interactions with comprehensive intent analysis.

**Input:**
```typescript
{
  message: string,
  conversationContext?: ConversationContext
}
```

**Output:**
```typescript
{
  response: string,
  understanding: ProductDiscovery,
  contextAnalysis: any,
  businessInsights: any,
  ambiguityAnalysis: any,
  needsClarification: boolean,
  clarificationQuestions: ClarificationQuestion[],
  conversationContext: ConversationContext,
  confidence: {
    overall: number,
    readyToRecommend: boolean
  }
}
```

### requirementsGatheringFlow

Processes clarification responses and updates understanding.

**Input:**
```typescript
{
  clarificationAnswer: string,
  questionAsked: string,
  conversationContext: ConversationContext
}
```

**Output:**
```typescript
{
  response: string,
  updatedUnderstanding: ProductDiscovery,
  needsMoreClarification: boolean,
  nextQuestions: ClarificationQuestion[],
  conversationContext: ConversationContext,
  readyForRecommendations: boolean
}
```

## Core Analysis Flows

### intentAnalysisFlow

Multi-step intent analysis with context integration.

**Input:**
```typescript
{
  query: string,
  conversationContext?: ConversationContext
}
```

**Output:**
```typescript
{
  understanding: ProductDiscovery,
  contextAnalysis: any,
  businessInsights: any,
  ambiguityAnalysis: any,
  needsClarification: boolean,
  clarificationQuestions: ClarificationQuestion[],
  updatedContext: ConversationContext
}
```

### contextExtractionFlow

Extracts industry, event, and recipient context.

**Input:**
```typescript
{
  query: string,
  previousContext?: Record<string, any>
}
```

**Output:**
```typescript
{
  industryContext: {
    detected: IndustryContext,
    confidence: number,
    indicators: string[],
    implications: IndustryImplications
  },
  eventContext: {
    detected: EventType,
    confidence: number,
    indicators: string[],
    implications: EventImplications
  },
  recipientContext: {
    detected: RecipientType,
    confidence: number,
    indicators: string[],
    implications: RecipientImplications
  }
}
```

### ambiguityDetectionFlow

Detects and analyzes potential ambiguities.

**Input:**
```typescript
{
  query: string,
  extractedData: any,
  conversationHistory?: string[]
}
```

**Output:**
```typescript
{
  detectedAmbiguities: DetectedAmbiguity[],
  clarificationPriority: ClarificationPriority[],
  overallAmbiguityScore: number
}
```

### clarificationGenerationFlow

Generates smart clarification questions.

**Input:**
```typescript
{
  ambiguities: any[],
  contextAnalysis: any,
  conversationState: string,
  maxQuestions?: number
}
```

**Output:**
```typescript
ClarificationQuestion[]
```

## Business Intelligence Flows

### businessIntelligenceFlow

Provides strategic recommendations and insights.

**Input:**
```typescript
{
  understanding: any,
  contextAnalysis: any
}
```

**Output:**
```typescript
{
  strategicRecommendations: StrategicRecommendation[],
  potentialConcerns: PotentialConcern[],
  opportunityInsights: OpportunityInsight[],
  industryBestPractices: string[]
}
```

## Conversation Management Flows

### conversationStateFlow

Manages conversation state transitions.

**Input:**
```typescript
{
  action: 'start' | 'continue' | 'clarify' | 'confirm' | 'complete',
  conversationContext: ConversationContext,
  userInput?: string,
  systemResponse?: string
}
```

**Output:**
```typescript
{
  updatedContext: ConversationContext,
  nextAction: 'wait_for_input' | 'ask_clarification' | 'provide_recommendations' | 'escalate',
  stateTransitionReason: string,
  conversationHealth: ConversationHealth
}
```

### learningAdaptationFlow

Analyzes conversations for system improvements.

**Input:**
```typescript
{
  conversationContext: ConversationContext,
  conversationMetrics: ConversationMetrics,
  userFeedback?: string
}
```

**Output:**
```typescript
{
  updatedPreferences: UserPreference,
  adaptationInsights: AdaptationInsight[],
  systemImprovements: SystemImprovement[]
}
```

### conversationQualityFlow

Assesses conversation quality and success.

**Input:**
```typescript
{
  conversationContext: ConversationContext,
  finalUnderstanding: any,
  userSatisfactionSignals?: string[]
}
```

**Output:**
```typescript
ConversationMetrics
```

### proactiveProblemDetectionFlow

Detects potential issues before they become problems.

**Input:**
```typescript
{
  conversationContext: ConversationContext,
  currentUnderstanding: any,
  recentUserInput: string
}
```

**Output:**
```typescript
{
  potentialIssues: PotentialIssue[],
  opportunityInsights: OpportunityInsight[],
  conversationRisk: number
}
```

## Data Types

### Core Schemas

#### ProductDiscovery
```typescript
{
  primaryIntent: IntentType,
  productType?: string,
  productCategories: string[],
  industryContext: IndustryContext,
  eventType: EventType,
  recipientType: RecipientType,
  attributes: Record<string, string>,
  quantity?: number,
  budget?: BudgetInfo,
  timeline?: TimelineInfo,
  ambiguities: Ambiguity[],
  confidence: ConfidenceScores
}
```

#### ConversationContext
```typescript
{
  conversationId: string,
  turnNumber: number,
  previousContext?: any,
  currentUnderstanding: ProductDiscovery,
  clarificationHistory: ClarificationHistory[],
  userPreferences?: Record<string, any>,
  conversationState: 'discovery' | 'clarification' | 'confirmation' | 'specification'
}
```

#### ClarificationQuestion
```typescript
{
  question: string,
  type: 'open_ended' | 'multiple_choice' | 'yes_no' | 'range',
  options?: string[],
  priority: 'high' | 'medium' | 'low',
  reasoning: string
}
```

### Enumerated Types

#### IntentType
- `product_search`
- `specification_inquiry`
- `budget_discussion`
- `timeline_planning`
- `comparison_request`
- `customization_details`
- `order_process`
- `general_question`

#### IndustryContext
- `technology`
- `healthcare`
- `finance`
- `education`
- `non_profit`
- `retail`
- `manufacturing`
- `hospitality`
- `legal`
- `creative_agency`
- `construction`
- `automotive`
- `real_estate`
- `unknown`

#### EventType
- `trade_show`
- `conference`
- `employee_onboarding`
- `client_appreciation`
- `product_launch`
- `company_anniversary`
- `holiday_gifts`
- `fundraising`
- `recruitment`
- `brand_awareness`
- `unknown`

#### AmbiguityType
- `product_category`
- `quantity_scope`
- `budget_interpretation`
- `timeline_urgency`
- `quality_expectation`
- `customization_extent`
- `recipient_specification`
- `none`

## Usage Examples

### Basic Conversation
```typescript
const result = await conversationFlow({
  message: "I need eco-friendly polo shirts for a tech company, navy blue, under €15",
  conversationContext: undefined
});

console.log(result.understanding.primaryIntent); // 'product_search'
console.log(result.needsClarification); // false (if clear enough)
console.log(result.confidence.readyToRecommend); // true (if confident)
```

### Handling Clarifications
```typescript
const clarificationResult = await requirementsGatheringFlow({
  clarificationAnswer: "50 shirts for our development team",
  questionAsked: "How many polo shirts do you need and who are they for?",
  conversationContext: previousContext
});

console.log(clarificationResult.readyForRecommendations); // true
```

### Context Analysis
```typescript
const contextResult = await contextExtractionFlow({
  query: "Professional looking items for our law firm clients",
  previousContext: {}
});

console.log(contextResult.industryContext.detected); // 'legal'
console.log(contextResult.recipientContext.detected); // 'clients'
```

## Error Handling

All flows include comprehensive error handling and will return appropriate error responses. Common error patterns:

- **Invalid Input**: Malformed input objects
- **Missing Context**: Required conversation context missing
- **API Limits**: Rate limiting or quota exceeded
- **Processing Errors**: Internal analysis failures

Errors are logged with context for debugging and system improvement.