export function assertServerSecret(name:string){if(typeof window!=="undefined")throw new Error("Secrets must never be accessed in the browser");if(!process.env[name])throw new Error(name+" is not configured");}
export function sanitizeTopic(value:string){return value.trim().replace(/[<>]/g,"").slice(0,500);}
