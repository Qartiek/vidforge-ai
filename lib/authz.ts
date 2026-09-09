export type ResourceOwner={userId:string};
export function assertOwner(resource:ResourceOwner,sessionUserId:string){if(!sessionUserId||resource.userId!==sessionUserId)throw new Error("Forbidden");}
export function assertAdmin(role:string){if(role!=="ADMIN")throw new Error("Admin access required");}
