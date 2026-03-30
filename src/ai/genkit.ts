/**
 * @fileOverview Genkit Framework Initialization.
 * Configures the primary AI engine for multimodal asset analysis.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI()
  ],
});
