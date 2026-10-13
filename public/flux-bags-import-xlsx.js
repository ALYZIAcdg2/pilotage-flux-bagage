const $=id=>document.getElementById(id);
let incoming=null,existing=null,decisions=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>v==null?'':String(v).trim();
const upper=v=>clean(v).toUpperCase();
const tag=v=>upper(v).replace(/[\s-]/g,'');
const flight=v=>upper(v).replace(/\s/g,'');
const identity=(date,r)=>date+'|'+tag(r.tagNumber||r.tag||r.numeroTag)+'|'+upper(r.cie||r.compagnie||r.airline||r.company);
const uniqueKey=(date,r)=>identity(date,r);
const keys=['cie','flightNumber','departureTime','tagNumber','inboundFlight','arrivalTime','location','remarks','anomaly','commentAction','fluxStatus','faultStation'];
const dataFields=['cie','flightNumber','departureTime','tagNumber','inboundFlight','arrivalTime','location','remarks','anomaly','commentAction','fluxStatus','faultStation'];
const summaryKeys=['expected','toProcess','saved','loaded','notLoaded'];
const makeStatus=s=>upper(s).replace(/\s+/g,' ');
const months={JANVIER:1,FEVRIER:2,MARS:3,AVRIL:4,MAI:5,JUIN:6,JUILLET:7,AOUT:8,SEPTEMBRE:9,OCTOBRE:10,NOVEMBRE:11,DECEMBRE:12};
function workbookPeriod(workbook){
 const dates=[];
 for(const sheet of workbook.worksheets){
  if(!/^\d{1,2}$/.test(sheet.name.trim()))continue;
  const heading=upper(sheet.getCell('C8').text).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const match=heading.match(/\b(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\s+(\d{2,4})\b/);
  if(!match)throw Error('Mois/année introuvables dans C8, feuille '+sheet.name);
  const year=Number(match[2].length===2?'20'+match[2]:match[2]);
  if(year<2000||year>2100)throw Error('Année invalide, feuille '+sheet.name);
  dates.push(year+'-'+String(months[match[1]]).padStart(2,'0'));
 }
 if(!dates.length||new Set(dates).size!==1)throw Error('Périodes incohérentes entre les feuilles journalières.');
 return dates[0];
}
function dateFromSheet(sheet,period){
 const m=/^(?:0?[1-9]|[12]\d|3[01])$/.exec(sheet.name.trim());
 if(!m)return null;
 const day=Number(m[0]),[year,month]=period.split('-').map(Number);
 if(day>new Date(year,month,0).getDate())throw Error('Jour invalide pour '+period+' : '+sheet.name);
 return period+'-'+String(day).padStart(2,'0');
}
function parseWorkbook(workbook){
 const days={};let total=0;const period=workbookPeriod(workbook);
 for(const sheet of workbook.worksheets){
  if(!/^\d{1,2}$/.test(sheet.name.trim()))continue;
  const date=dateFromSheet(sheet,period);if(!date)continue;
  const rows=[],summary=[],remarks=[];
  const heading=sheet.getRow(27);
  if(upper(heading.getCell(1).text)!=='CIE'||!upper(heading.getCell(4).text).includes('TAG'))throw Error('Colonnes inattendues, feuille '+sheet.name+' ligne 27');
  for(let i=28;i<=sheet.rowCount;i++){
   const r=sheet.getRow(i),values=Array.from({length:12},(_,j)=>clean(r.getCell(j+1).text));
   if(!values[0]||!values[3]||!(/^[A-Z0-9]{2,3}$/i.test(values[0])))continue;
   const obj=Object.fromEntries(keys.map((k,j)=>[k,values[j]]));obj.cie=upper(obj.cie);obj.flightNumber=flight(obj.flightNumber);obj.tagNumber=tag(obj.tagNumber);obj.fluxStatus=makeStatus(obj.fluxStatus);rows.push(obj);
  }
  for(let i=11;i<=23;i++){const r=sheet.getRow(i),code=upper(r.getCell(3).text);if(!/^[A-Z0-9]{2,3}$/.test(code))continue;const obj={airline:code};summaryKeys.forEach((k,j)=>{const v=r.getCell(j+4).value;obj[k]=typeof v==='number'?v:Number(clean(r.getCell(j+4).text).replace(',','.'))||0;});summary.push(obj);}
  const remark=clean(sheet.getCell('J8').text);if(remark&&remark.toUpperCase()!=='REMARQUES :')remarks.push(remark);
  days[date]={records:rows,summary,remarks};total+=rows.length;
 }
 if(!Object.keys(days).length)throw Error('Aucune feuille journalière (1 à 30/31) reconnue.');
 return {days,total};
}
function summarize(){
 if(!incoming||!existing)return;
 const old=existing.data||{},conflicts=[],newRecords=[];
 for(const [date,day] of Object.entries(incoming.days)){
  const byTag=new Map((old[date]||[]).filter(r=>tag(r.tagNumber||r.tag||r.numeroTag)).map(r=>[identity(date,r),r]));
  for(const r of day.records){const key=uniqueKey(date,r);if(byTag.has(key))conflicts.push({date,key,old:byTag.get(key),next:r});else newRecords.push({date,key,next:r});}
 }
 incoming.conflicts=conflicts;incoming.additions=newRecords;
 $('preview').innerHTML='<b>'+Object.keys(incoming.days).length+' journées</b> · '+incoming.total+' lignes · <b>'+conflicts.length+' correspondances existantes</b> · '+newRecords.length+' nouveaux dossiers.';
 $('conflicts').innerHTML=conflicts.length?'<h2>Doublons détectés</h2><p>Choisissez une action pour chaque dossier existant. <b>Mettre à jour</b> complète uniquement les champs renseignés dans Excel. <b>Écraser</b> remplace le dossier entier. <b>Annuler</b> ignore ce dossier.</p><label>Action par défaut <select id="defaultDecision"><option value="cancel">Annuler (sécurité)</option><option value="update">Mettre à jour</option><option value="overwrite">Écraser</option></select></label><div class="conflict-list">'+conflicts.map((c,i)=>'<div class="conflict"><strong>'+esc(c.date)+' · '+esc(c.next.cie)+' '+esc(c.next.flightNumber)+' · '+esc(c.next.tagNumber)+'</strong><select data-conflict="'+i+'"><option value="default">Action par défaut</option><option value="update">Mettre à jour</option><option value="overwrite">Écraser</option><option value="cancel">Annuler</option></select></div>').join('')+'</div>':'<p>Aucun dossier existant correspondant : seuls les nouveaux dossiers seront ajoutés.</p>';
 $('apply').disabled=false;
}
async function parseFile(file){
 $('apply').disabled=true;$('status').textContent='Lecture et comparaison…';
 if(!file||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Choisissez un fichier .xlsx.');
 if(!window.ExcelJS)throw Error('Bibliothèque Excel indisponible.');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
 incoming=parseWorkbook(wb);
 const res=await fetch('/api/data',{cache:'no-store'});if(!res.ok)throw Error('Chargement de la base TEST impossible : '+res.status);
 existing=await res.json();summarize();$('status').textContent='Prévisualisation prête. Aucune donnée modifiée.';
}
$('file').onchange=async()=>{try{await parseFile($('file').files[0]);}catch(e){incoming=null;$('apply').disabled=true;$('status').textContent='Erreur : '+e.message;}};
function decisionFor(i){const choice=document.querySelector('[data-conflict="'+i+'"]')?.value;return choice&&choice!=='default'?choice:$('defaultDecision')?.value||'cancel';}
$('apply').onclick=async()=>{
 if(!incoming||!existing)return;
 if(!confirm('Confirmer l’import sur TEST ? Les dossiers non correspondants seront ajoutés. Les doublons suivront les décisions choisies.'))return;
 $('apply').disabled=true;
 try{
  const fresh=await fetch('/api/data',{cache:'no-store'});if(!fresh.ok)throw Error('Vérification des données : '+fresh.status);
  const live=await fresh.json();
  // Refuse changes when database has changed since the preview to avoid stale overwrites.
  for(const date of Object.keys(incoming.days))if(JSON.stringify(live.data?.[date]||[])!==JSON.stringify(existing.data?.[date]||[]))throw Error('La journée '+date+' a changé depuis la prévisualisation. Rechargez le fichier.');
  const decisionsByKey=new Map(incoming.conflicts.map((c,i)=>[c.key,decisionFor(i)]));
  const updates=[];let added=0,changed=0,skipped=0;
  for(const [date,day] of Object.entries(incoming.days)){
   const old=live.data?.[date]||[],list=old.map(r=>({...r})),index=new Map(list.map((r,i)=>[identity(date,r),i]));
   for(const next of day.records){
    const key=identity(date,next),i=index.get(key);
    if(i===undefined){index.set(key,list.length);list.push(next);added++;continue;}
    const action=decisionsByKey.get(key)||'cancel';
    if(action==='cancel'){skipped++;continue;}
    if(action==='overwrite'){list[i]={...next};changed++;continue;}
    if(action==='update'){const patch=Object.fromEntries(Object.entries(next).filter(([,v])=>v!==''&&v!=null));list[i]={...list[i],...patch};changed++;}
   }
   if(JSON.stringify(old)!==JSON.stringify(list))updates.push({date,records:list});
  }
  if(!updates.length){$('status').textContent='Aucun changement à enregistrer. '+skipped+' doublons ignorés.';return;}
  // Add missing daily summaries/remarks, but never overwrite existing KPI or remarks.
  const metadataPatch={};for(const [date,day] of Object.entries(incoming.days)){const month=date.slice(0,7),sk='flux_bags_daily_summary_'+month,rk='flux_bags_remarks_'+month;const oldSummary=live.metadata?.[sk]||{},oldRemarks=live.metadata?.[rk]||{};if(!Object.prototype.hasOwnProperty.call(oldSummary,date)&&day.summary.length){metadataPatch[sk]={...(metadataPatch[sk]||oldSummary),[date]:day.summary};}if(!Object.prototype.hasOwnProperty.call(oldRemarks,date)&&day.remarks.length){metadataPatch[rk]={...(metadataPatch[rk]||oldRemarks),[date]:day.remarks};}}
  for(let i=0;i<updates.length;i+=2){const slice=updates.slice(i,i+2);const res=await fetch('/api/days',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({days:slice,metadata:i===0?metadataPatch:{}})});if(!res.ok)throw Error('Écriture API '+res.status+' : '+(await res.text()).slice(0,180));$('status').textContent='Journées enregistrées : '+Math.min(i+2,updates.length)+' / '+updates.length;}
  $('status').textContent='Import terminé : '+added+' ajoutés, '+changed+' modifiés, '+skipped+' doublons ignorés. Les récapitulatifs existants ont été préservés ; les récapitulatifs manquants ont été ajoutés.';
  existing=null;incoming=null;$('apply').disabled=true;
 }catch(e){$('status').textContent='IMPORT INTERROMPU : '+e.message+' (certaines journées ont pu être enregistrées). Rechargez le fichier avant de recommencer.';}finally{if(incoming)$('apply').disabled=false;}
};
