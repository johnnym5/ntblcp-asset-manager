'use server';

/**
 * @fileOverview AI flow to suggest missing asset details based on OCR label data.
 *
 * - suggestAssetDetails - Function to trigger the flow.
 * - SuggestAssetDetailsInput - Input type for the function.
 * - SuggestAssetDetailsOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAssetDetailsInputSchema = z.object({
  ocrText: z
    .string()
    .describe('The OCR text extracted from the asset label.'),
  existingDetails: z.record(z.any()).optional().describe('Existing asset details, if any.'),
});
export type SuggestAssetDetailsInput = z.infer<typeof SuggestAssetDetailsInputSchema>;

const SuggestAssetDetailsOutputSchema = z.record(z.any()).describe('Suggested asset details to complete the asset record.');
export type SuggestAssetDetailsOutput = z.infer<typeof SuggestAssetDetailsOutputSchema>;

export async function suggestAssetDetails(input: SuggestAssetDetailsInput): Promise<SuggestAssetDetailsOutput> {
  return suggestAssetDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAssetDetailsPrompt',
  input: {schema: SuggestAssetDetailsInputSchema},
  output: {schema: SuggestAssetDetailsOutputSchema},
  prompt: `You are an AI assistant designed to help users complete asset details quickly.
  Based on the OCR text extracted from the asset label and existing details, suggest any missing information from public sources.
  Return the suggested details as a JSON object. Keys should be descriptive and values should be the suggested information.

  Here's the OCR Text: {{{ocrText}}}
  Here are the Existing Details: {{{existingDetails}}}

  Suggest missing details:
  `,
});

const suggestAssetDetailsFlow = ai.defineFlow(
  {
    name: 'suggestAssetDetailsFlow',
    inputSchema: SuggestAssetDetailsInputSchema,
    outputSchema: SuggestAssetDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
