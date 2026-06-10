import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const ENV = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if(k) ENV[k.trim()] = v.join('=').trim();
});

async function check() {
  console.log('Fetching instances...');
  const res = await fetch(ENV.EVOLUTION_API_URL + '/instance/fetchInstances', {
    headers: { 'apikey': ENV.EVOLUTION_API_KEY }
  });
  const data = await res.json();
  const instances = Array.isArray(data) ? data : (data.instances || data.data || []);
  console.log('Total instances:', instances.length);
  
  for (const inst of instances) {
    const name = inst?.instanceName || inst?.instance?.instanceName || inst?.name;
    if (!name) continue;
    const whRes = await fetch(ENV.EVOLUTION_API_URL + '/webhook/find/' + name, {
      headers: { 'apikey': ENV.EVOLUTION_API_KEY }
    });
    console.log(`Webhook for ${name}:`, await whRes.text());
  }
}

check().catch(console.error);
