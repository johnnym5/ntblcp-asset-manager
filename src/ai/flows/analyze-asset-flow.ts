'use server';
/**
 * @fileOverview Asset Physical Condition Analysis Flow.
 * Uses Gemini 1.5 Flash to evaluate asset health from field photos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const AnalyzeAssetInputSchema = z.object({
  photoDataUri: z.string().describe("Base64 encoded photo of the asset."),
  description: z.string().describe("The registry description of the asset."),
});

const AnalyzeAssetOutputSchema = z.object({
  suggestedCondition: z.enum([
    "New",
    "Used- good condition",
    "Used but in good working condition",
    "Used but requires occasional repair",
    "Used but in poor condition",
    "Bad condition",
    "F2: Major repairs required-poor condition",
    "Unsalvageable",
    "Burnt",
    "Stolen",
    "Obsolete",
    "Insurance settlement",
    "Writeoff"
  ]).describe("The AI suggested physical condition rating."),
  confidenceScore: z.number().describe("Confidence level from 0 to 1."),
  reasoning: z.string().describe("Rationale for the suggested condition."),
});

export async function analyzeAssetHealth(input: z.infer<typeof AnalyzeAssetInputSchema>) {
  return analyzeAssetFlow(input);
}

const analyzeAssetFlow = ai.defineFlow(
  {
    name: 'analyzeAssetFlow',
    inputSchema: AnalyzeAssetInputSchema,
    outputSchema: AnalyzeAssetOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      input: {
        schema: AnalyzeAssetInputSchema,
      },
      output: {
        schema: AnalyzeAssetOutputSchema,
      },
      prompt: [
        { media: { url: input.photoDataUri } },
        { text: `Analyze this asset for physical verification.
          Registry Description: ${input.description}
          
          Based on the photo and description, determine the most accurate physical condition from the provided schema. 
          Look for signs of damage, wear, or catastrophic loss (burnt/stolen).` }
      ],
    });

    return response.output!;
  }
);
