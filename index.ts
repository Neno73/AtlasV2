import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export default genkit({
  plugins: [googleAI()],
  flows: [__dirname + '/src/flows.ts'],
  logLevel: 'debug',
  enableTracing: true,
});
