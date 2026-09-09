import type { AIProvider, ProviderResult, TextProvider, TextTask } from "./types";
class UnconfiguredProvider implements TextProvider {
  constructor(private provider: AIProvider) {}
  async generate(_task: TextTask, _prompt: string): Promise<ProviderResult> {
    throw new Error(`${this.provider} provider is not configured on the server`);
  }
}
export function getTextProvider(name: AIProvider): TextProvider { return new UnconfiguredProvider(name); }
