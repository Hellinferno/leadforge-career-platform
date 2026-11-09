import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';
import {defineConfig} from 'vite';
export default defineConfig({plugins:[vinext(),cloudflare({configPath:'wrangler.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},persistState:{path:'.wrangler/state'},inspectorPort:false})]});
