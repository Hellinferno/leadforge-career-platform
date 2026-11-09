import {configured,ownerSecrets,run} from './cli.mjs';
try{configured();const secrets=await ownerSecrets();await run(['secret','bulk','--config','wrangler.jsonc'],JSON.stringify(secrets)+'\n');console.log('Owner password configured. Existing sessions were invalidated. Open your Worker URL and sign in.');}catch(error){console.error(error.message);process.exitCode=1;}
