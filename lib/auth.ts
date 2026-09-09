import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
const COOKIE="vidforge_session", TTL=7*24*60*60*1000;
const hashToken=(t:string)=>createHash("sha256").update(t).digest("hex");
const validEmail=(e:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export type SessionUser={id:string;email:string;name?:string|null;role:"USER"|"ADMIN"};
export async function createSession(user:SessionUser){const token=randomBytes(32).toString("base64url");await db.session.create({data:{userId:user.id,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+TTL)}});(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:TTL/1000});}
export async function clearSession(){const jar=await cookies(),token=jar.get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:hashToken(token)}});jar.delete(COOKIE);}
export async function getSessionUser():Promise<SessionUser|null>{const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;const session=await db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:{select:{id:true,email:true,name:true,role:true}}}});if(!session||session.expiresAt<=new Date()){if(session)await db.session.delete({where:{id:session.id}});return null;}await db.session.update({where:{id:session.id},data:{lastUsedAt:new Date()}});return session.user;}
export async function registerUser(email:string,password:string,name?:string){email=email.trim().toLowerCase();if(!validEmail(email)||password.length<10)throw new Error("Invalid credentials");const passwordHash=await bcrypt.hash(password,12);return db.user.create({data:{email,passwordHash,name:name?.trim().slice(0,80)||null},select:{id:true,email:true,name:true,role:true}});}
export async function loginUser(email:string,password:string){const user=await db.user.findUnique({where:{email:email.trim().toLowerCase()}});if(!user||!(await bcrypt.compare(password,user.passwordHash)))throw new Error("Invalid credentials");return {id:user.id,email:user.email,name:user.name,role:user.role};}
