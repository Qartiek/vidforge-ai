export function boundedString(value:unknown,max:number){if(typeof value!=="string")return null;const v=value.trim();return v? v.slice(0,max):null;}
export function safeEnum<T extends string>(value:unknown,allowed:readonly T[]):T|null{return typeof value==="string"&&allowed.includes(value as T)?value as T:null;}
export function safePositiveInt(value:unknown,max:number){const n=Number(value);return Number.isInteger(n)&&n>0&&n<=max?n:null;}
