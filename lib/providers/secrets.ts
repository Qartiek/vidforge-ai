const KEYS={openai:"OPENAI_API_KEY",anthropic:"ANTHROPIC_API_KEY",google:"GOOGLE_AI_API_KEY"} as const;
export function providerConfigured(provider:keyof typeof KEYS){return Boolean(process.env[KEYS[provider]]);}
export function providerKeyName(provider:keyof typeof KEYS){return KEYS[provider];}
