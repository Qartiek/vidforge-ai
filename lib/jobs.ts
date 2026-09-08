export type JobType="research"|"content"|"voice"|"visuals"|"render"|"thumbnail"|"seo"|"publish";
export type JobStatus="queued"|"running"|"complete"|"failed";
export type Job={id:string;type:JobType;status:JobStatus;attempts:number;createdAt:string;updatedAt:string};
export function createJob(type:JobType):Job{const now=new Date().toISOString();return {id:crypto.randomUUID(),type,status:"queued",attempts:0,createdAt:now,updatedAt:now};}
export function nextJobStatus(status:JobStatus):JobStatus{return status==="queued"?"running":status==="running"?"complete":status;}
export function canRetry(attempts:number,maxAttempts=3){return attempts<maxAttempts;}
