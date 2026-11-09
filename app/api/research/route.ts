import {getCurrentUser} from "../../auth";
import {researchWebsite} from "../../../lib/research";
export const dynamic="force-dynamic";
const attempts=new Map<string,number>();
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return Response.json({error:"Sign in to research company websites.",needsSignIn:true},{status:401});
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid request origin."},{status:403});
  if(Date.now()-(attempts.get(user.userId)||0)<10000)return Response.json({error:"Please wait a few seconds before researching another company."},{status:429});
  try{const raw=await request.text();if(raw.length>2000)throw new Error("Website URL is too long.");const body=JSON.parse(raw);if(typeof body.website!=="string"||!body.website.trim())throw new Error("Enter a company website.");attempts.set(user.userId,Date.now());const result=await researchWebsite(body.website);return Response.json(result,{headers:{'Cache-Control':'no-store'}});}
  catch(error){const message=(error as Error).message;return Response.json({error:/timeout|aborted/i.test(message)?"Research timed out. Try the company's direct contact page, or add its public details manually.":message||"Could not research this website."},{status:400});}
}
