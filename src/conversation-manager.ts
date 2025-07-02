import { gemini15Flash } from '@genkit-ai/googleai';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { ConversationContextSchema, type ConversationContext } from './schemas.js';

// Conversation Success Metrics Schema
export const ConversationMetricsSchema = z.object({
  conversationId: z.string(),
  totalTurns: z.number(),
  clarificationTurns: z.number(),
  successfulResolution: z.boolean(),
  finalConfidenceScore: z.number(),
  timeToResolution: z.number().optional(),
  userSatisfactionIndicators: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  learningInsights: z.array(z.object({
    pattern: z.string(),
    frequency: z.number(),
    recommendation: z.string()
  }))
});

// User Preference Learning Schema
export const UserPreferenceSchema = z.object({
  communicationStyle: z.enum(['direct', 'detailed', 'casual', 'formal']),
  industryExpertise: z.enum(['beginner', 'intermediate', 'expert']),
  preferredQuestionTypes: z.array(z.enum(['open_ended', 'multiple_choice', 'yes_no', 'range'])),
  commonProductCategories: z.array(z.string()),
  budgetRanges: z.array(z.string()),
  timelinePatterns: z.array(z.string()),
  clarificationPatterns: z.record(z.number()) // Track which ambiguities occur frequently
});

// Conversation State Management Flow
export const conversationStateFlow = defineFlow(
  {
    name: 'conversationStateFlow',
    inputSchema: z.object({
      action: z.enum(['start', 'continue', 'clarify', 'confirm', 'complete']),
      conversationContext: ConversationContextSchema,
      userInput: z.string().optional(),
      systemResponse: z.string().optional()
    }),
    outputSchema: z.object({
      updatedContext: ConversationContextSchema,
      nextAction: z.enum(['wait_for_input', 'ask_clarification', 'provide_recommendations', 'escalate']),
      stateTransitionReason: z.string(),
      conversationHealth: z.object({
        progressScore: z.number(),
        stuckIndicator: z.boolean(),
        recommendedIntervention: z.string().optional()
      })
    })
  },
  async ({ action, conversationContext, userInput, systemResponse }) => {
    const stateAnalysisPrompt = definePrompt({
      name: 'conversationStateAnalysis',
      model: gemini15Flash,
      input: {
        schema: z.object({
          currentAction: z.string(),
          conversationHistory: z.string(),
          currentState: z.string(),
          userInput: z.string(),
          systemResponse: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          nextState: z.enum(['discovery', 'clarification', 'confirmation', 'specification']),
          nextAction: z.enum(['wait_for_input', 'ask_clarification', 'provide_recommendations', 'escalate']),
          progressAssessment: z.object({
            score: z.number(),
            isProgressing: z.boolean(),
            stuckIndicator: z.boolean(),
            reasonForStuck: z.string().optional()
          }),
          recommendedIntervention: z.string().optional(),
          learningOpportunities: z.array(z.string())
        })
      },
      prompt: `Analyze the conversation state and determine next actions.

Current Action: {{currentAction}}
Conversation History: {{conversationHistory}}
Current State: {{currentState}}
User Input: {{userInput}}
System Response: {{systemResponse}}

Assess:
1. **Progress**: Is the conversation moving toward successful product recommendation?
2. **State Transition**: What should the next conversation state be?
3. **Action Required**: What should the system do next?
4. **Health Check**: Is the conversation stuck or progressing well?
5. **Learning**: What patterns can be learned from this interaction?

Progress Scoring (0.0-1.0):
- 0.0-0.3: Not progressing, confusion or misunderstanding
- 0.4-0.6: Some progress, but clarifications needed
- 0.7-0.9: Good progress, moving toward resolution
- 1.0: Ready for recommendations

Stuck Indicators:
- Multiple clarification rounds on same topic
- User expressing frustration
- Circular conversation patterns
- Confidence scores not improving`
    });

    const historyString = conversationContext.clarificationHistory
      .map((h, i) => `Turn ${i + 1}: Q: ${h.question} A: ${h.answer}`)
      .join('\n');

    const analysisResult = await stateAnalysisPrompt({
      input: {
        currentAction: action,
        conversationHistory: historyString,
        currentState: conversationContext.conversationState,
        userInput: userInput || '',
        systemResponse: systemResponse || ''
      }
    });

    const analysis = analysisResult.output;

    // Update conversation context with new state
    const updatedContext: ConversationContext = {
      ...conversationContext,
      conversationState: analysis.nextState,
      turnNumber: conversationContext.turnNumber + 1
    };

    return {
      updatedContext,
      nextAction: analysis.nextAction,
      stateTransitionReason: `State changed to ${analysis.nextState} because: ${analysis.progressAssessment.reasonForStuck || 'normal progression'}`,
      conversationHealth: {
        progressScore: analysis.progressAssessment.score,
        stuckIndicator: analysis.progressAssessment.stuckIndicator,
        recommendedIntervention: analysis.recommendedIntervention
      }
    };
  }
);

// Learning and Adaptation Flow
export const learningAdaptationFlow = defineFlow(
  {
    name: 'learningAdaptationFlow',
    inputSchema: z.object({
      conversationContext: ConversationContextSchema,
      conversationMetrics: ConversationMetricsSchema,
      userFeedback: z.string().optional()
    }),
    outputSchema: z.object({
      updatedPreferences: UserPreferenceSchema,
      adaptationInsights: z.array(z.object({
        category: z.string(),
        insight: z.string(),
        confidence: z.number(),
        actionable: z.boolean()
      })),
      systemImprovements: z.array(z.object({
        area: z.string(),
        issue: z.string(),
        suggestedFix: z.string(),
        priority: z.enum(['high', 'medium', 'low'])
      }))
    })
  },
  async ({ conversationContext, conversationMetrics, userFeedback }) => {
    const learningAnalysisPrompt = definePrompt({
      name: 'learningAnalysisPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          conversationData: z.string(),
          metrics: z.string(),
          feedback: z.string(),
          previousPreferences: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          userPreferences: UserPreferenceSchema,
          learningInsights: z.array(z.object({
            category: z.string(),
            insight: z.string(),
            confidence: z.number(),
            actionable: z.boolean()
          })),
          systemImprovements: z.array(z.object({
            area: z.string(),
            issue: z.string(),
            suggestedFix: z.string(),
            priority: z.enum(['high', 'medium', 'low'])
          }))
        })
      },
      prompt: `Analyze conversation patterns to improve future interactions.

Conversation Data: {{conversationData}}
Metrics: {{metrics}}
User Feedback: {{feedback}}
Previous Preferences: {{previousPreferences}}

Learn from:
1. **Communication Patterns**: How does this user prefer to communicate?
2. **Question Effectiveness**: Which types of questions worked best?
3. **Ambiguity Patterns**: What ambiguities occurred and why?
4. **Context Accuracy**: How accurate was context detection?
5. **Resolution Efficiency**: Could we have reached resolution faster?

Generate:
1. **Updated User Preferences**: Communication style, expertise level, preferences
2. **Learning Insights**: Patterns that can improve future conversations
3. **System Improvements**: Areas where the system could be enhanced

Focus on actionable insights that will make future conversations more efficient and accurate.`
    });

    const analysisResult = await learningAnalysisPrompt({
      input: {
        conversationData: JSON.stringify(conversationContext, null, 2),
        metrics: JSON.stringify(conversationMetrics, null, 2),
        feedback: userFeedback || 'No feedback provided',
        previousPreferences: JSON.stringify(conversationContext.userPreferences, null, 2)
      }
    });

    const analysis = analysisResult.output;

    return {
      updatedPreferences: analysis.userPreferences,
      adaptationInsights: analysis.learningInsights,
      systemImprovements: analysis.systemImprovements
    };
  }
);

// Conversation Quality Assessment Flow
export const conversationQualityFlow = defineFlow(
  {
    name: 'conversationQualityFlow',
    inputSchema: z.object({
      conversationContext: ConversationContextSchema,
      finalUnderstanding: z.any(),
      userSatisfactionSignals: z.array(z.string()).optional()
    }),
    outputSchema: ConversationMetricsSchema
  },
  async ({ conversationContext, finalUnderstanding, userSatisfactionSignals }) => {
    const qualityAssessmentPrompt = definePrompt({
      name: 'qualityAssessmentPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          conversationData: z.string(),
          finalUnderstanding: z.string(),
          satisfactionSignals: z.string()
        })
      },
      output: {
        format: 'json',
        schema: ConversationMetricsSchema
      },
      prompt: `Assess the quality and success of this promotional products consultation.

Conversation Data: {{conversationData}}
Final Understanding: {{finalUnderstanding}}
Satisfaction Signals: {{satisfactionSignals}}

Evaluate:
1. **Resolution Success**: Did we reach a clear understanding?
2. **Efficiency**: Could this have been resolved in fewer turns?
3. **User Experience**: Was the interaction smooth and professional?
4. **Accuracy**: How accurate was our final understanding?
5. **Learning Value**: What can be learned for future conversations?

Satisfaction Indicators:
- Positive: "Perfect", "exactly", "that's right", "thank you"
- Neutral: Acknowledgments without enthusiasm
- Negative: "no", "not quite", "confused", frustration indicators

Generate comprehensive metrics for continuous improvement.`
    });

    const assessmentResult = await qualityAssessmentPrompt({
      input: {
        conversationData: JSON.stringify(conversationContext, null, 2),
        finalUnderstanding: JSON.stringify(finalUnderstanding, null, 2),
        satisfactionSignals: userSatisfactionSignals?.join(', ') || 'No signals detected'
      }
    });

    return assessmentResult.output;
  }
);

// Proactive Problem Detection Flow
export const proactiveProblemDetectionFlow = defineFlow(
  {
    name: 'proactiveProblemDetectionFlow',
    inputSchema: z.object({
      conversationContext: ConversationContextSchema,
      currentUnderstanding: z.any(),
      recentUserInput: z.string()
    }),
    outputSchema: z.object({
      potentialIssues: z.array(z.object({
        issue: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        recommendation: z.string(),
        preventiveAction: z.string()
      })),
      opportunityInsights: z.array(z.object({
        opportunity: z.string(),
        description: z.string(),
        suggestedAction: z.string()
      })),
      conversationRisk: z.number() // 0-1 scale
    })
  },
  async ({ conversationContext, currentUnderstanding, recentUserInput }) => {
    const problemDetectionPrompt = definePrompt({
      name: 'problemDetectionPrompt',
      model: gemini15Flash,
      input: {
        schema: z.object({
          context: z.string(),
          understanding: z.string(),
          userInput: z.string()
        })
      },
      output: {
        format: 'json',
        schema: z.object({
          potentialIssues: z.array(z.object({
            issue: z.string(),
            severity: z.enum(['low', 'medium', 'high']),
            recommendation: z.string(),
            preventiveAction: z.string()
          })),
          opportunityInsights: z.array(z.object({
            opportunity: z.string(),
            description: z.string(),
            suggestedAction: z.string()
          })),
          conversationRisk: z.number()
        })
      },
      prompt: `Proactively detect potential issues and opportunities in this promotional products consultation.

Context: {{context}}
Current Understanding: {{understanding}}
Recent User Input: {{userInput}}

Detect:
1. **Potential Issues**:
   - Misunderstandings building up
   - User frustration or confusion
   - Timeline conflicts
   - Budget misalignment
   - Specification impossibilities

2. **Opportunities**:
   - Upselling possibilities
   - Better solutions for their needs
   - Cost-saving alternatives
   - Value-add suggestions

3. **Risk Assessment**:
   - How likely is this conversation to fail?
   - What early warning signs exist?

Risk Scoring:
- 0.0-0.3: Low risk, conversation proceeding well
- 0.4-0.6: Medium risk, some concerns
- 0.7-1.0: High risk, intervention needed

Focus on prevention and proactive value creation.`
    });

    const detectionResult = await problemDetectionPrompt({
      input: {
        context: JSON.stringify(conversationContext, null, 2),
        understanding: JSON.stringify(currentUnderstanding, null, 2),
        userInput: recentUserInput
      }
    });

    return detectionResult.output;
  }
);