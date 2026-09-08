import type {AIProvider,TextProvider} from "./types";
class UnconfiguredProvider implements TextProvider{constructor(private provider:AIProvider){}async generate(){throw new Error(this.provider+" provider is not configured on the server");}}
export function getTextProvider(name:AIProvider):TextProvider{return new UnconfiguredProvider(name);}
