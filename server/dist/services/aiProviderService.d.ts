export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
}
export interface AIConfig {
    provider: 'openai' | 'gemini' | 'claude';
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export declare abstract class BaseAIProvider {
    protected config: AIConfig;
    constructor(config: AIConfig);
    abstract generateResponse(prompt: string): Promise<AIResponse>;
    abstract extractReminders(text: string): Promise<any[]>;
    abstract categorizeContent(text: string): Promise<string[]>;
}
export declare class OpenAIProvider extends BaseAIProvider {
    private client;
    constructor(config: AIConfig);
    generateResponse(prompt: string): Promise<AIResponse>;
    extractReminders(text: string): Promise<any[]>;
    categorizeContent(text: string): Promise<string[]>;
}
export declare class GeminiProvider extends BaseAIProvider {
    private client;
    constructor(config: AIConfig);
    generateResponse(prompt: string): Promise<AIResponse>;
    extractReminders(text: string): Promise<any[]>;
    categorizeContent(text: string): Promise<string[]>;
}
export declare class ClaudeProvider extends BaseAIProvider {
    private client;
    constructor(config: AIConfig);
    generateResponse(prompt: string): Promise<AIResponse>;
    extractReminders(text: string): Promise<any[]>;
    categorizeContent(text: string): Promise<string[]>;
}
export declare class AIProviderFactory {
    static createProvider(config: AIConfig): BaseAIProvider;
    static getAvailableProviders(): {
        id: string;
        name: string;
        models: string[];
        description: string;
    }[];
}
//# sourceMappingURL=aiProviderService.d.ts.map