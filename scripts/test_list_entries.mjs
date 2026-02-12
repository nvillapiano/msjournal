import { listEntries } from '../server/utils/journalStore.mjs';

async function main(){
  const entries = await listEntries();
  console.log(JSON.stringify(entries, null, 2));
}

main().catch(e=>{console.error('ERR', e); process.exit(1)});
