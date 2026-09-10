export type QualityReport={score:number;checks:{name:string;status:"pass"|"warn";detail:string}[];ready:boolean};
export function runContentQualityChecks(input:{title?:string;script?:string;description?:string}):QualityReport{
 const script=input.script?.trim()||"";const title=input.title?.trim()||"";const description=input.description?.trim()||"";
 const checks=[
  {name:"Title present",status:title?"pass":"warn",detail:title?"Title is available":"Title is missing"},
  {name:"Script present",status:script?"pass":"warn",detail:script?"Script is available":"Script is missing"},
  {name:"Hook in opening",status:/hook|why|imagine|here's|heres|today/i.test(script.slice(0,700))?"pass":"warn",detail:"Opening should establish a strong, honest reason to keep watching"},
  {name:"CTA",status:/subscribe|follow|comment|share|learn more/i.test(script.slice(-1200))?"pass":"warn",detail:"A natural CTA is recommended near the ending"},
  {name:"Description",status:description?"pass":"warn",detail:description?"Description is available":"Description is missing"},
  {name:"Verification safety",status:/\[VERIFY\]/i.test(script)?"warn":"pass",detail:/\[VERIFY\]/i.test(script)?"Some claims require verification":"No explicit verification flags"}
 ] as QualityReport["checks"];
 const passed=checks.filter(x=>x.status==="pass").length;const score=Math.round((passed/checks.length)*100);
 return {score,checks,ready:score>=80};
}
