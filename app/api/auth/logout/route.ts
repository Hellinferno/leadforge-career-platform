import {sameOrigin,sessionCookie} from '../../../../lib/auth-core';
export async function POST(request:Request){if(!sameOrigin(request))return new Response('Invalid request origin.',{status:403});return new Response(null,{status:303,headers:{Location:new URL('/login',request.url).href,'Cache-Control':'no-store','Set-Cookie':sessionCookie(new URL(request.url).origin,'',true)}});}
