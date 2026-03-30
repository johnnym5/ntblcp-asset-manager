'use server';

/**
 * @fileOverview Asset Label OCR Extraction Flow.
 * 
 * - extractAssetData: Analyzes a photo of an asset label and extracts technical markers.
 * - OCRInputSchema: Data URI of the asset label image.
 * - OCROutputSchema: Structured asset identification fields.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const OCRInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an asset label or nameplate, as a data URI (base64 encoded)."
    ),
});

const OCROutputSchema = z.object({
  serialNumber: z.string().optional().describe("The unique serial number (S/N) found on the label."),
  modelNumber: z.string().optional().describe("The manufacturer's model number or name."),
  manufacturer: z.string().optional().describe("The company or brand that produced the asset."),
  description: z.string().optional().describe("A brief, professional description of the item based on visual cues."),
  confidence: z.number().min(0).max(1).describe("The AI's confidence level in the extracted data."),
});

export type OCRInput = z.infer<typeof OCRInputSchema>;
export type OCROutput = z.infer<typeof OCROutputSchema>;

export async function extractAssetData(input: OCRInput): Promise<OCROutput> {
  return extractAssetDataFlow(input);
}

const ocrPrompt = ai.definePrompt({
  name: 'ocrAssetLabelPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: OCRInputSchema },
  output: { schema: OCROutputSchema },
  prompt: `You are an expert field auditor specializing in asset identification.
  
Analyze the provided image of an asset label, nameplate, or tag.
Extract the technical specifications accurately.

RULES:
1. Prioritize 'Serial Number' or 'S/N'.
2. Identify the 'Model Number' or 'Ref Number'.
3. Identify the 'Manufacturer' (e.g., HP, Toyota, GE, Cummins).
4. If the label is blurry or values are unclear, provide your best guess but set the confidence score lower.
5. Do not hallucinate data that is not visible.

Label Image: {{media url=photoDataUri}}`,
});

const extractAssetDataFlow = ai.defineFlow(
  {
    name: 'extractAssetDataFlow',
    inputSchema: OCRInputSchema,
    outputSchema: OCROutputSchema,
  },
  async (input) => {
    const { output } = await ocrPrompt(input);
    if (!output) {
      throw new Error("AI Pulse failed to return structured extraction.");
    }
    return output;
  }
);
