import type { Transaction } from '@/models/transaction';
import Groq from 'groq-sdk';

export interface AIContext {
    timezone: string;
    userCurrency: string;
    userLanguage: string;
    userTags: { name: string }[];
    userLocations: { name: string }[];
    userCategories: { name: string; type: 'income' | 'expense' }[];
    localTime: string;
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
        this.model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
    }

    private buildPrompt(context: AIContext, text: string): string {
        return `
            Objective: 
                Extract financial transaction information from the input text and return it strictly in this JSON schema:

            Input:
                - Text: ${text}

            Context:
                - Current time: ${context.localTime}
                - currency: ${context.userCurrency}
                - tags: ${JSON.stringify(context.userTags)}
                - locations: ${JSON.stringify(context.userLocations)}

            Categories:
                - Income categories: ${context.userCategories.filter(c => c.type === 'income').map(c => c.name).join(', ')}
                - Expense categories: ${context.userCategories.filter(c => c.type === 'expense').map(c => c.name).join(', ')}

            Output Format:
            {
                "found": true,
                "transactions": [
                    {
                        "amount": number,                             // Default: 0 if not found
                        "type": "income" | "expense", 
                        "category": string,                           // Must match one of the given categories (income categories for type 'income', expense categories for type 'expense')
                        "timestamp": string,                          // ISO 8601 (default: context.localTime)
                        "note": string,                               // Brief factual summary in ${context.userLanguage}, Use objective and factual language.
                        "currency": string,                           // Currency mentioned in Text else context.currency
                        "location": string (optional),                // Match from context.locations
                        "emoji": string,                              // One emoji best representing the transaction
                        "tags": string[]                              // Relevant from context.tags
                    }
                ]
            }
            If no transaction is detected, return:
            {
                "found": false,
                "transactions": []
            }
        `;
    }

    async recognizeBill(text: string, context: AIContext): Promise<Transaction[] | null> {
        try {
            const prompt = this.buildPrompt(context, text);
            
            const response = await this.groq.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert financial ledger assistant. Extract transaction details and output strictly valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' }
            });

            const textContent = response.choices[0]?.message?.content;
            if (!textContent) {
                throw new Error('AI response is undefined or empty');
            }

            const parsed = JSON.parse(textContent.trim());
            if (!parsed.found) {
                return null;
            }

            if (parsed.transactions && Array.isArray(parsed.transactions)) {
                for (const t of parsed.transactions) {
                    if (typeof t.amount !== 'number' || t.amount < 0 || t.amount > 100000000) {
                        throw new Error('Invalid amount from AI');
                    }
                    if (!['income', 'expense'].includes(t.type)) {
                        throw new Error('Invalid type from AI');
                    }
                }
            }

            return parsed.transactions;
        } catch (error) {
            console.error('AI recognition error:', error);
            throw error;
        }
    }
}