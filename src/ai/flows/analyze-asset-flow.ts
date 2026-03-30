'use server';

/**
 * @fileOverview Asset Diagnostic Intelligence Flow.
 * 
 * - analyzeAssetHealth: Suggests maintenance and audit pulses based on asset state.
 * - DiagnosticInputSchema: Asset data context.
 * - DiagnosticOutputSchema: Intelligent maintenance suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const DiagnosticInputSchema = z.object({
  description: z.string(),
  condition: z.string(),
  category: z.string(),
  remarks: z.string().optional(),
});

const DiagnosticOutputSchema = z.object({
  healthScore: z.number().min(0).max(100).describe("A numerical score of the asset's operational health."),
  maintenancePulse: z.string().describe("Suggested next action for the auditor or technician."),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  aiInsight: z.string().describe("A brief, expert-level interpretation of the asset's current state."),
});

export type DiagnosticInput = z.infer<typeof DiagnosticInputSchema>;
export type DiagnosticOutput = z.infer<typeof DiagnosticOutputSchema>;

export async function analyzeAssetHealth(input: DiagnosticInput): Promise<DiagnosticOutput> {
  return analyzeAssetHealthFlow(input);
}

const diagnosticPrompt = ai.definePrompt({
  name: 'analyzeAssetHealthPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: DiagnosticInputSchema },
  output: { schema: DiagnosticOutputSchema },
  prompt: `You are an expert reliability engineer analyzing physical assets in a government registry.
  
Analyze the following asset context and provide a technical health pulse.

Asset: {{description}}
Category: {{category}}
Reported Condition: {{condition}}
Auditor Remarks: {{remarks}}

Identify operational risks, suggest maintenance pulses, and assign a health score.
Provide your response in a calm, professional, and deterministic tone.`,
});

const analyzeAssetHealthFlow = ai.defineFlow(
  {
    name: 'analyzeAssetHealthFlow',
    inputSchema: DiagnosticInputSchema,
    outputSchema: DiagnosticOutputSchema,
  },
  async (input) => {
    const { output } = await diagnosticPrompt(input);
    if (!output) throw new Error("Diagnostic Pulse failure.");
    return output;
  }
);
