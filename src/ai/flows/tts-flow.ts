
'use server';

/**
 * @fileOverview Auditor Hands-Free Voice Flow.
 * 
 * - speakAssetProfile: Converts asset metadata into a professional audio pulse.
 * - TTSInputSchema: Asset identity context.
 * - TTSOutputSchema: Data URI of the generated WAV audio.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const TTSInputSchema = z.object({
  description: z.string(),
  idCode: z.string().optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
});

const TTSOutputSchema = z.object({
  audioUri: z.string().describe("A WAV audio pulse as a base64 Data URI."),
});

export type TTSInput = z.infer<typeof TTSInputSchema>;
export type TTSOutput = z.infer<typeof TTSOutputSchema>;

export async function speakAssetProfile(input: TTSInput): Promise<TTSOutput> {
  return speakAssetProfileFlow(input);
}

const speakAssetProfileFlow = ai.defineFlow(
  {
    name: 'speakAssetProfileFlow',
    inputSchema: TTSInputSchema,
    outputSchema: TTSOutputSchema,
  },
  async (input) => {
    const text = `Asset: ${input.description}. Tag ID: ${input.idCode || 'No tag detected'}. Status: ${input.status || 'Pending'}. Condition is ${input.condition || 'Unassessed'}.`;

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: text,
    });

    if (!media || !media.url) {
      throw new Error("Voice Pulse generation failure.");
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

/**
 * Converts PCM buffer from Gemini TTS into a standards-compliant WAV string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
