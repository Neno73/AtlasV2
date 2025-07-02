import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export default configure({
  plugins: [googleAI()],
  flows: [__dirname + '/flows.ts'],
  logLevel: 'debug',
  enableTracing: true,
});
