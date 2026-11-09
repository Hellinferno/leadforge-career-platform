import {getDocumentProxy} from 'unpdf';
export async function readPdfText(bytes:Uint8Array,budgetMs=10000){
  const deadline=Date.now()+Math.max(100,Math.min(10000,budgetMs)),warnings:string[]=[];let pdf:Awaited<ReturnType<typeof getDocumentProxy>>|undefined;
  async function timed<T>(work:Promise<T>):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('PDF extraction reached its time limit.')),Math.max(1,deadline-Date.now()));})]);}finally{if(timer)clearTimeout(timer);}}
  try{
    pdf=await timed(getDocumentProxy(bytes,{disableFontFace:true,useSystemFonts:false,useWorkerFetch:false,disableAutoFetch:true,disableStream:true,verbosity:0}));
    const pages:string[]=[];if(pdf.numPages>30)warnings.push(`Only the first 30 of ${pdf.numPages} PDF pages were inspected.`);
    let total=0;for(let i=1;i<=Math.min(pdf.numPages,30);i++){const page=await timed(pdf.getPage(i)),content=await timed(page.getTextContent());let text='',lastY:number|null=null,endX:number|null=null;for(const item of content.items){if(!('str'in item))continue;const y=item.transform[5],x=item.transform[4];if(lastY!==null&&Math.abs(y-lastY)>3){text+='\n';endX=null;}if(endX!==null)text+=x-endX>18?' | ':' ';text+=item.str;endX=x+item.width;lastY=y;if(item.hasEOL){text+='\n';lastY=null;endX=null;}if(text.length>80000)break;}total+=text.length;if(total>500000){warnings.push('The PDF text limit was reached; only the earlier pages were inspected.');break;}pages.push(text);page.cleanup();}
    return{pages,warnings};
  }finally{await pdf?.loadingTask.destroy();}
}
