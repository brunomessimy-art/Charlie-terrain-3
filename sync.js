let pairToken=localStorage.getItem('charliTerrainPair')||'';
const match=location.hash.match(/^#pair=([a-f0-9]{64})$/);
if(match){pairToken=match[1];localStorage.setItem('charliTerrainPair',pairToken);history.replaceState(null,'',location.pathname)}
let syncing=false;
window.charliPcMissions=window.charliPcMissions||[];
function syncLabel(message){
 const a=document.getElementById('syncState');if(a)a.textContent=message;
 const b=document.getElementById('syncPageState');if(b)b.textContent=message;
}
function updateLastSync(){
 const raw=localStorage.getItem('charliTerrainLastSync');
 const el=document.getElementById('lastSyncLabel');
 if(!el)return;
 if(!raw){el.textContent='Jamais';return}
 const d=new Date(raw);el.textContent='OK – '+d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
updateLastSync();
async function syncTerrain(){
  if(syncing)return;
  if(!pairToken){syncLabel('Liaison non configurée. Depuis le PC : Paramètres → liaison Terrain, puis ouvre le lien sur ce téléphone.');return}
  syncing=true;syncLabel('Synchronisation en cours…');
  try{
    const pending=missions.filter(m=>!m.synced);
    for(const m of pending)if(!m.id)m.id='terrain-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14);
    if(pending.length)persist();
    const r=await fetch(pending.length?'/api/sync':'/api/snapshot',{method:pending.length?'POST':'GET',headers:{'Authorization':'Bearer '+pairToken,'Content-Type':'application/json'},body:pending.length?JSON.stringify({missions:pending}):undefined,signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error(r.status===401?'Liaison refusée. Rouvre le lien affiché sur le PC.':'Connexion indisponible ('+r.status+').');
    const data=await r.json();
    const accepted=new Set(data.accepted||[]);
    for(const m of missions)if(accepted.has(m.id))m.synced=true;
    window.charliPcMissions=data.missions||[];
    persist();if(window.renderMissionPage)window.renderMissionPage();
    const now=new Date();localStorage.setItem('charliTerrainLastSync',now.toISOString());updateLastSync();
    const pendingAfter=missions.filter(m=>!m.synced).length;
    syncLabel('Connecté à Charli STM • '+pendingAfter+' mission(s) en attente • dernière mise à jour '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
    const pc=document.getElementById('pcMissions');if(pc)pc.innerHTML=window.charliPcMissions.slice(-25).reverse().map(m=>`<div class="pcMission"><b>${esc(m.title)}</b><small>${esc(m.team)} • ${esc(m.status)}${m.date?' • '+esc(m.date):''}</small></div>`).join('');
  }catch(e){syncLabel('Hors connexion : rien n’est perdu sur le téléphone. '+(e.name==='TimeoutError'?'PC inaccessible.':e.message))}
  finally{syncing=false}
}
window.syncTerrain=syncTerrain;
const b1=document.getElementById('syncNow');if(b1)b1.onclick=syncTerrain;
const b2=document.getElementById('syncPageBtn');if(b2)b2.onclick=syncTerrain;
// Synchronisation volontairement MANUELLE : pas de timer ni d'envoi automatique.
