import Groq from 'groq-sdk';
import type { Transaction } from '@/models/transaction';

export interface AIContext {
    timezone: string;
    userCurrency: string;
    userLanguage: string;
    userTags: { name: string }[];
    userLocations: { name: string }[];
    userCategories: { name: string; type: 'income' | 'expense' }[];
}

export class AIService {
    private groq: Groq;
    private model: string;

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Groq API key not configured');
        }
        this.groq = new Groq({ apiKey });
        this.model = process.env.GROQ_VISION_MODEL || 'llama-3.2-90b-vision-preview';
    }

    private buildPrompt(context: AIContext): string {
        return `
            Extract financial transaction information from the image and return it strictly in this JSON schema:

            Context:
                - CurrentTime: ${new Date().toISOString()}
                - currency: ${context.userCurrency}
                - tags: ${JSON.stringify(context.userTags)}
                - locations: ${JSON.stringify(context.userLocations)}

            Categories:
                - Income categories: ${context.userCategories.filter(c => c.type === 'income').map(c => c.name).join(', ')}
                - Expense categories: ${context.userCategories.filter(c => c.type === 'expense').map(c => c.name).join(', ')}

            Output Format:
            {
                "found": true,
                "transaction": 
                {
                    "amount": number,                             // Default: 0 if not found
                    "type": "income" | "expense", 
                    "category": string,                           // Must match one of the given categories (income categories for type 'income', expense categories for type 'expense')
                    "timestamp": string,                          // using context.CurrentTime
                    "note": string,                               // Brief factual summary in ${context.userLanguage}, Use objective and factual language.
                    "currency": string,                           // Currency mentioned in Text else context.currency
                    "location": string (optional),                // Match from context.locations
                    "emoji": string,                              // One emoji best representing the transaction
                    "tags": string[]                              // Relevant from context.tags
                }
            }
            If no transaction is detected, return:
            {
                "found": false,
                "transaction": {}
            }
        `;
    }

    async recognizeBill(imageData: string, mimeType: string, context: AIContext): Promise<Transaction | null> {
        try {
            const prompt = this.buildPrompt(context);

            const response = await this.groq.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert financial receipt scanner. Analyze image and output strictly valid JSON.'
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageData}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: 'json_object' }
            });

            const text = response.choices[0]?.message?.content;
            if (!text) throw new Error('Empty AI response');
            
            const parsed = JSON.parse(text.trim());
            if (!parsed.found) {
                return null;
            }

            if (parsed.transaction) {
                const t = parsed.transaction;
                if (typeof t.amount !== 'number' || t.amount < 0 || t.amount > 100000000) {
                    throw new Error('Invalid amount from AI');
                }
                if (!['income', 'expense'].includes(t.type)) {
                    throw new Error('Invalid type from AI');
                }
            }

            return parsed.transaction;
        } catch (error) {
            console.error('AI recognition error:', error);
            throw error;
        }
    }
}