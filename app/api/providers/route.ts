import {NextResponse} from "next/server";
import {providerConfigured} from "../../../lib/providers/secrets";
export async function GET(){return NextResponse.json({providers:{openai:{configured:providerConfigured("openai")},anthropic:{configured:providerConfigured("anthropic")},google:{configured:providerConfigured("google")}},note:"Provider secrets are server-side only."});}
