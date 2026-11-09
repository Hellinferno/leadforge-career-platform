import {existsSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ask,ownerSecrets,run} from './cli.mjs';
try{const path=fileURLToPath(new URL('../.dev.vars',import.meta.url));if(existsSync(path)&&await ask('Replace the existing local password/session secrets? Type yes')!=='yes')throw new Error('Local settings kept.');const secrets=await ownerSecrets();writeFileSync(path,Object.entries(secrets).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});await run(['d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to','.wrangler/state']);console.log('Local database and private login are ready. Run pnpm dev.');}catch(error){console.error(error.message);process.exitCode=1;}
