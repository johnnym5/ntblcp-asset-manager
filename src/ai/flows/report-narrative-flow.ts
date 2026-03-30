'use server';

/**
 * @fileOverview Audit Report Narrative Generation Flow.
 * 
 * - generateReportNarrative: Drafts professional executive summaries for Travel Reports.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const NarrativeInputSchema = z.object({
  location: z.string(),
  projectName: z.string(),
  stats: z.object({
    total: z.number(),
    verified: z.number(),
    exceptions: z.number(),
    dataGaps: z.number(),
  }),
  topExceptions: z.array(z.string()).describe("List of critical descriptions or remarks found."),
});

const NarrativeOutputSchema = z.object({
  summary: z.string().describe("A high-level executive summary of the verification visit."),
  findings: z.string().describe("Bulleted list of technical findings based on the data."),
  recommendations: z.string().describe("Professional management recommendations for state-level action."),
});

export type NarrativeInput = z.infer<typeof NarrativeInputSchema>;
export type NarrativeOutput = z.infer<typeof NarrativeOutputSchema>;

export async function generateReportNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  return generateReportNarrativeFlow(input);
}

const narrativePrompt = ai.definePrompt({
  name: 'generateReportNarrativePrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: NarrativeInputSchema },
  output: { schema: NarrativeOutputSchema },
  prompt: `You are a Lead Asset Auditor drafting an official Executive Travel Report.
  
Project: {{projectName}}
Location: {{location}}
Scope: {{stats.total}} assets
Verified: {{stats.verified}}
Exceptions: {{stats.exceptions}}
Data Gaps: {{stats.dataGaps}}

Critical Observations:
{{#each topExceptions}}
- {{this}}
{{/each}}

Write a high-fidelity, professional report narrative.
RULES:
1. Use an objective, enterprise-grade tone.
2. The summary should emphasize the current verification coverage ({{stats.verified}} of {{stats.total}}).
3. The findings must interpret the exceptions accurately.
4. Recommendations should be actionable and focused on data integrity and security.

Deliver the content in three distinct parts: Summary, Findings, and Recommendations.`,
});

const generateReportNarrativeFlow = ai.defineFlow(
  {
    name: 'generateReportNarrativeFlow',
    inputSchema: NarrativeInputSchema,
    outputSchema: NarrativeOutputSchema,
  },
  async (input) => {
    const { output } = await narrativePrompt(input);
    if (!output) throw new Error("Narrative Pulse failure.");
    return output;
  }
);
