import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const ENV = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if(k) ENV[k.trim()] = v.join('=').trim();
});

async function update() {
  console.log('Fetching instances...');
  const res = await fetch(ENV.EVOLUTION_API_URL + '/instance/fetchInstances', {
    headers: { 'apikey': ENV.EVOLUTION_API_KEY }
  });
  const data = await res.json();
  const instances = Array.isArray(data) ? data : (data.instances || data.data || []);
  
  for (const inst of instances) {
    const name = inst?.instanceName || inst?.instance?.instanceName || inst?.name;
    if (!name) continue;
    
    console.log(`Updating webhook for ${name}...`);
    const payload = {
      webhook: {
        enabled: true,
        url: ENV.WINDMILL_WEBHOOK_URL,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
      }
    };
    
    const r = await fetch(ENV.EVOLUTION_API_URL + '/webhook/set/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ENV.EVOLUTION_API_KEY },
      body: JSON.stringify(payload)
    });
    
    if(!r.ok) {
       // fallback for older versions
       await fetch(ENV.EVOLUTION_API_URL + '/webhook/update/' + name, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'apikey': ENV.EVOLUTION_API_KEY },
         body: JSON.stringify(payload.webhook) // flat
       });
    }
    
    const whRes = await fetch(ENV.EVOLUTION_API_URL + '/webhook/find/' + name, {
      headers: { 'apikey': ENV.EVOLUTION_API_KEY }
    });
    console.log(`New Webhook for ${name}:`, await whRes.text());
  }
}

update().catch(console.error);
