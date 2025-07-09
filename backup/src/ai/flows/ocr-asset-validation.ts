'use server';

/**
 * @fileOverview Uses OCR to read asset labels from uploaded documents and images to automatically fill in asset entries and validate the information.
 *
 * - validateAssetLabel - A function that handles the asset label validation process.
 * - ValidateAssetLabelInput - The input type for the validateAssetLabel function.
 * - ValidateAssetLabelOutput - The return type for the validateAssetLabel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAssetLabelInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an asset label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  currentValues: z.record(z.string(), z.any()).optional().describe('The current values of the asset fields, which may be overridden by the OCR result.'),
});
export type ValidateAssetLabelInput = z.infer<typeof ValidateAssetLabelInputSchema>;

const ValidateAssetLabelOutputSchema = z.object({
  extractedData: z.record(z.string(), z.any()).describe('The data extracted from the asset label via OCR.'),
  shouldOverride: z.boolean().describe('Whether or not the extracted data should override the current values.'),
});
export type ValidateAssetLabelOutput = z.infer<typeof ValidateAssetLabelOutputSchema>;

export async function validateAssetLabel(input: ValidateAssetLabelInput): Promise<ValidateAssetLabelOutput> {
  return validateAssetLabelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateAssetLabelPrompt',
  input: {schema: ValidateAssetLabelInputSchema},
  output: {schema: ValidateAssetLabelOutputSchema},
  prompt: `You are an expert at extracting data from asset labels using OCR.

You will be provided with an image of an asset label and the current values of the asset's fields.

Your task is to extract the data from the asset label and determine whether the extracted data should override the current values.

Here is the image of the asset label:
{{media url=photoDataUri}}

Here are the current values of the asset's fields (if any):
{{#if currentValues}}
{{json currentValues}}
{{else}}
No current values.
{{/if}}

Based on the extracted data and the current values, determine whether the extracted data should override the current values. Consider factors such as the confidence level of the OCR, the completeness of the extracted data, and the accuracy of the current values.

Return the extracted data in the 'extractedData' field and whether the extracted data should override the current values in the 'shouldOverride' field.

Ensure the extracted data conforms to valid JSON format.
`,
});

const validateAssetLabelFlow = ai.defineFlow(
  {
    name: 'validateAssetLabelFlow',
    inputSchema: ValidateAssetLabelInputSchema,
    outputSchema: ValidateAssetLabelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
