// Test examples to validate the Atlas system handles complex intent understanding

export const TEST_SCENARIOS = {
  // Scenario 1: Display preference separation
  display_preference_separation: {
    query: "show me bags with images",
    expectedUnderstanding: {
      productType: "bags",
      displayPreference: "with images",
      separatedCorrectly: true
    },
    description: "Should understand user wants bags AND wants to see images, not search for 'bags images'"
  },

  // Scenario 2: Ambiguous product category
  ambiguous_product_category: {
    query: "I need something for a trade show",
    expectedAmbiguities: [
      "product_category", // "something" is too vague
      "quantity_scope", // how many items?
      "recipient_specification" // staff, attendees, giveaways?
    ],
    description: "Should detect multiple ambiguities requiring clarification"
  },

  // Scenario 3: Budget scope confusion
  budget_scope_confusion: {
    query: "Corporate gifts under $20",
    expectedAmbiguities: [
      "budget_interpretation" // per item vs total budget?
    ],
    expectedClarifications: [
      "Is that $20 per item or $20 total budget?"
    ],
    description: "Should clarify if budget is per item or total"
  },

  // Scenario 4: Quality expectation ambiguity
  quality_expectation_ambiguity: {
    query: "Premium quality polo shirts for our tech startup",
    contextClues: {
      industry: "technology",
      qualityTerm: "premium"
    },
    expectedContext: {
      industry: "technology",
      qualityExpectation: "high-tech, modern, sleek designs"
    },
    description: "Should interpret 'premium' in context of tech industry"
  },

  // Scenario 5: Multi-layer ambiguity
  complex_multi_ambiguity: {
    query: "Need some nice items for the team by next month",
    expectedAmbiguities: [
      "product_category", // "items" too vague
      "quantity_scope", // "some" unclear
      "quality_expectation", // "nice" subjective
      "timeline_urgency", // "by next month" - flexible?
      "recipient_specification" // "team" size unknown
    ],
    description: "Should detect multiple overlapping ambiguities"
  },

  // Scenario 6: Industry-specific interpretation
  industry_specific_interpretation: {
    query: "Professional looking items for our law firm clients",
    expectedContext: {
      industry: "legal",
      recipient: "clients",
      qualityLevel: "premium"
    },
    expectedRecommendations: [
      "executive gifts",
      "sophisticated accessories",
      "high-quality materials"
    ],
    description: "Should understand law firm context requires premium client gifts"
  },

  // Scenario 7: Event context detection
  event_context_detection: {
    query: "Bags for our company conference in Chicago",
    expectedContext: {
      eventType: "conference",
      productType: "bags",
      urgentNeed: true
    },
    expectedClarifications: [
      "How many attendees?",
      "What's your timeline?",
      "Conference swag bags or laptop bags?"
    ],
    description: "Should detect conference context and ask relevant clarifications"
  },

  // Scenario 8: Assumption validation
  assumption_validation: {
    query: "Eco-friendly products for our sustainability campaign",
    expectedAssumptions: [
      {
        assumption: "Wants environmentally sustainable products",
        shouldVerify: true,
        clarification: "Are you looking for recycled materials, sustainable production, or biodegradable products?"
      }
    ],
    description: "Should verify what 'eco-friendly' means to the client"
  },

  // Scenario 9: Complex specification requirements
  complex_specifications: {
    query: "Custom logo on high-quality shirts matching our brand colors",
    expectedAmbiguities: [
      "customization_extent", // logo size, placement, technique?
      "quality_expectation", // what's "high-quality"?
    ],
    expectedClarifications: [
      "What decoration technique do you prefer for the logo?",
      "Do you need exact PMS color matching?",
      "What's your target price range per shirt?"
    ],
    description: "Should ask about logo specifications and color matching requirements"
  },

  // Scenario 10: Conversation repair
  conversation_repair: {
    initialQuery: "I need promotional items",
    clarificationQ: "What type of promotional items are you looking for?",
    userResponse: "Actually, I meant giveaways for a trade show",
    expectedRepair: {
      updatedUnderstanding: {
        productType: "giveaways",
        eventType: "trade_show",
        confidenceIncrease: true
      }
    },
    description: "Should update understanding based on clarification and reduce ambiguity"
  }
};

// Test validation functions
export function validateIntentSeparation(result: any, scenario: any): boolean {
  // Check if the system properly separated product intent from display preference
  const understanding = result.understanding;
  
  if (scenario.query === "show me bags with images") {
    return understanding.productType?.includes("bag") && 
           !understanding.productType?.includes("images");
  }
  
  return false;
}

export function validateAmbiguityDetection(result: any, expectedAmbiguities: string[]): boolean {
  const detectedTypes = result.ambiguityAnalysis?.detectedAmbiguities?.map((a: any) => a.type) || [];
  
  return expectedAmbiguities.every(expected => 
    detectedTypes.includes(expected)
  );
}

export function validateContextExtraction(result: any, expectedContext: any): boolean {
  const context = result.contextAnalysis;
  
  if (expectedContext.industry) {
    if (context?.industryContext?.detected !== expectedContext.industry) {
      return false;
    }
  }
  
  if (expectedContext.eventType) {
    if (context?.eventContext?.detected !== expectedContext.eventType) {
      return false;
    }
  }
  
  return true;
}

export function validateClarificationQuality(clarificationQuestions: any[]): boolean {
  return clarificationQuestions.every(q => 
    q.question && 
    q.question.length > 10 && // Substantial questions
    q.reasoning && // Has reasoning
    q.priority && // Has priority
    !q.question.includes("undefined") // No undefined references
  );
}

// Example conversation flows for testing
export const CONVERSATION_FLOWS = {
  successfulDiscovery: [
    {
      user: "I need eco-friendly polo shirts for a tech company, navy blue, under €15",
      expectedFlow: "direct_to_recommendations" // Clear enough to proceed
    },
    {
      user: "I need some items for employees",
      expectedFlow: "requires_clarification",
      expectedQuestions: ["What type of items?", "How many employees?", "What's the occasion?"]
    }
  ],
  
  ambiguityResolution: [
    {
      turn: 1,
      user: "Corporate gifts under $20",
      assistant: "Is that $20 per gift or $20 total budget? And who are these gifts for?",
      expectedState: "clarification"
    },
    {
      turn: 2,
      user: "$20 per gift for our top 10 clients",
      assistant: "Great! Now I understand you need 10 premium client gifts at $20 each. What industry is your company in?",
      expectedState: "specification"
    }
  ]
};