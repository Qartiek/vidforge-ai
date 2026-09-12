import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

const defaults = {
 appearance:{theme:"dark",density:"comfortable",motion:true},
 notifications:{email:true,product:true,jobs:true,marketing:false},
 ai:{creativity:0.7,provider:"openai",model:"gpt-4o-mini",deepReasoning:true,retentionEngine:true,trendSense:true,visualDirector:true,autoRepurpose:true,qualityGate:true},
 video:{aspectRatio:"16:9",quality:"1080p Full HD",durationMode:"auto",duration:60,fps:30},
 voice:{voice:"alloy",captions:true,captionStyle:"clean"},
 privacy:{analytics:true,personalization:true},
 accessibility:{reducedMotion:false,highContrast:false}
};
export async function GET(){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});const rows=await db.$queryRaw<Array<{data:unknown}>>`SELECT "data" FROM "UserSettings" WHERE "userId" = ${user.id} LIMIT 1`;const data=rows[0]?.data??{};return NextResponse.json({settings:{...defaults,...(data as object)}});}
export async function PATCH(request:Request){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});const body=await request.json().catch(()=>null);if(!body||typeof body!=="object"||Array.isArray(body)||!body.settings||typeof body.settings!=="object")return NextResponse.json({error:"Invalid settings payload"},{status:400});const settings=body.settings as Record<string,unknown>;const allowed=Object.keys(defaults);const sanitized=Object.fromEntries(Object.entries(settings).filter(([key])=>allowed.includes(key)));const json=JSON.stringify(sanitized);await db.$executeRaw`INSERT INTO "UserSettings" ("id","userId","data") VALUES (${`settings_${user.id}`},${user.id},${json}::jsonb) ON CONFLICT ("userId") DO UPDATE SET "data" = "UserSettings"."data" || EXCLUDED."data", "updatedAt" = CURRENT_TIMESTAMP`;const rows=await db.$queryRaw<Array<{data:unknown}>>`SELECT "data" FROM "UserSettings" WHERE "userId" = ${user.id} LIMIT 1`;return NextResponse.json({ok:true,settings:rows[0]?.data??sanitized});}
