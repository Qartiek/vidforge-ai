import {appConfig} from "./config";
export const PLAN_CREDITS={free:0,starter:5,pro:25,business:100} as const;
export function canGenerate(credits:number,cost=1){return credits>=cost;}
export function generationCost(){return 1;}
export {appConfig};
