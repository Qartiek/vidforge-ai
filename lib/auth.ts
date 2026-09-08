export type SessionUser={id:string;email:string;name?:string|null;role:"USER"|"ADMIN"};
export function getSessionUser():SessionUser|null{return null;}
export function requireAuth(){const user=getSessionUser();if(!user)throw new Error("Authentication required");return user;}
