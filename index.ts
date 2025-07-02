import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { conversationFlow, requirementsGatheringFlow } from './src/flows';
import { productDiscoveryFlow } from './flows/atlas-flows';

genkit({
  plugins: [googleAI()],
});

export {
  conversationFlow,
  productDiscoveryFlow,
  requirementsGatheringFlow
};
