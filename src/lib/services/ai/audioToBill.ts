import type { Transaction } from '@/models/transaction';
import { AIService as TextToBillService, AIContext } from './textToBill';

export type { AIContext };

import Groq from 'groq-sdk';

export class AIService {
    private groq: Groq;
    private textToBillService: TextToBillService;

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Groq API key not configured');
        }
        this.groq = new Groq({ apiKey });
        this.textToBillService = new TextToBillService();
    }

    private async transcribeAudio(formData: FormData): Promise<string> {
        try {
            const file = formData.get('file') as File;
            if (!file) {
                throw new Error('No audio file found in form data');
            }

            const transcriptionResponse = await this.groq.audio.transcriptions.create({
                file,
                model: 'whisper-large-v3',
                response_format: 'json',
            });

            if (transcriptionResponse && transcriptionResponse.text) {
                return transcriptionResponse.text;
            } else {
                throw new Error('Invalid transcription response format from Groq');
            }
            
        } catch (error) {
            console.error('Error during audio transcription:', error);
            throw error;
        }
    }

    async recognizeBill(formData: FormData, context: AIContext): Promise<Transaction[] | null> {
        try {
            // Step 1: Transcribe the audio
            const transcriptionText = await this.transcribeAudio(formData);
            // console.log('Transcription result:', transcriptionText);
            // Step 2: Use textToBill service to process the transcribed text
            return this.textToBillService.recognizeBill(transcriptionText, context);
        } catch (error) {
            console.error('AI recognition error:', error);
            throw error;
        }
    }
} 