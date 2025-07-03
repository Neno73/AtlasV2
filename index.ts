import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit first
genkit({
  plugins: [googleAI()],
});

// Then import flow factories after Genkit is initialized
import { createConversationFlow, createRequirementsGatheringFlow } from './src/flows';
import { createProductDiscoveryFlow } from './flows/atlas-flows';

// Initialize flows
const conversationFlow = createConversationFlow();
const requirementsGatheringFlow = createRequirementsGatheringFlow();
const productDiscoveryFlow = createProductDiscoveryFlow();

export {
  conversationFlow,
  productDiscoveryFlow,
  requirementsGatheringFlow
};
