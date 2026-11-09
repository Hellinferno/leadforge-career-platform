export const dynamic='force-dynamic';
const retired=()=>Response.json({error:'API-backed discovery has been replaced by the custom contact scraper. Reload the app to use it.'},{status:410,headers:{'Cache-Control':'no-store'}});
export const GET=retired;
export const POST=retired;
