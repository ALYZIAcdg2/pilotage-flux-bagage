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
  let headerRow=0;
  for(let i=25;i<=Math.min(35,sheet.rowCount);i++){
   const heading=sheet.getRow(i);
   if(upper(heading.getCell(1).text)==='CIE'&&upper(heading.getCell(4).text).includes('TAG')){headerRow=i;break;}
  }
  if(!headerRow)throw Error('En-tête CIE / N° TAG introuvable, feuille '+sheet.name+' lignes 25 à 35');
  for(let i=headerRow+1;i<=sheet.rowCount;i++){
   const r=sheet.getRow(i),values=Array.from({length:12},(_,j)=>clean(r.getCell(j+1).text));
   if(!values[0]||!values[3]||!(/^[A-Z0-9]{2,3}$/i.test(values[0])))continue;
   const obj=Object.fromEntries(keys.map((k,j)=>[k,values[j]]));obj.cie=upper(obj.cie);obj.flightNumber=flight(obj.flightNumber);obj.tagNumber=tag(obj.tagNumber);obj.fluxStatus=makeStatus(obj.fluxStatus);rows.push(obj);
  }
  for(let i=11;i<=26;i++){const r=sheet.getRow(i),code=upper(r.getCell(3).text);if(!/^[A-Z0-9]{2,3}$/.test(code))continue;const obj={airline:code};summaryKeys.forEach((k,j)=>{const v=r.getCell(j+4).value;obj[k]=typeof v==='number'?v:Number(clean(r.getCell(j+4).text).replace(',','.'))||0;});summary.push(obj);}
  const remark=clean(sheet.getCell('J8').text);if(remark&&remark.toUpperCase()!=='REMARQUES :')remarks.push(remark);
  days[date]={records:rows,summary,remarks};total+=rows.length;
 }
 if(!Object.keys(days).length)throw Error('Aucune feuille journalière (1 à 30/31) reconnue.');
 return {days,total};
}
// Compare complete imported rows as a multiset: identical rows may legitimately repeat.
const rowSignature=r=>JSON.stringify(keys.map(k=>clean(r[k])));
function missingRows(date,records,existingRows){
 const counts=new Map();
 for(const r of existingRows||[]){const k=rowSignature(r);counts.set(k,(counts.get(k)||0)+1);}
 const missing=[];
 for(const r of records){const k=rowSignature(r),count=counts.get(k)||0;
  if(count>0)counts.set(k,count-1);else missing.push(r);
 }
 return missing;
}

function updateDay(date,oldRows,newRows){
 const buckets=new Map();
 for(const r of oldRows){const key=identity(date,r);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}
 const used=new Map(),result=[];let added=0,changed=0;
 for(const row of newRows){
  const key=identity(date,row),index=used.get(key)||0,old=buckets.get(key)?.[index];
  used.set(key,index+1);
  if(old){const next={...old,...row};if(rowSignature(next)!==rowSignature(old))changed++;result.push(next);}
  else{result.push(row);added++;}
 }
 // Preserve unmentioned existing records, including legitimate repeated tags.
 for(const [key,rows] of buckets)result.push(...rows.slice(used.get(key)||0));
 return {records:result,added,changed,removed:0};
}
function buildPlan(live,mode){
 const updates=[],metadataPatch={},totals={added:0,changed:0,removed:0,days:0,expected:0};
 for(const [date,day] of Object.entries(incoming.days)){
  const old=live.data?.[date]||[],next=mode==='replace'
   ?{records:day.records,added:Math.max(0,day.records.length-old.length),changed:0,removed:Math.max(0,old.length-day.records.length)}
   :updateDay(date,old,day.records);
  // A replace always writes the selected day; update writes only when its contents change.
  if(mode==='replace'||JSON.stringify(next.records)!==JSON.stringify(old))updates.push({date,records:next.records});
  totals.added+=next.added;totals.changed+=next.changed;totals.removed+=next.removed;totals.days++;
  const month=date.slice(0,7),sk='flux_bags_daily_summary_'+month,rk='flux_bags_remarks_'+month,ek='flux_bags_expected_daily_'+date;
  if(day.summary.length){
   metadataPatch[sk]={...(metadataPatch[sk]||live.metadata?.[sk]||{}),[date]:day.summary};
   const expected={...(live.metadata?.[ek]||{})};
   for(const item of day.summary){
    const code=upper(item.airline),value=Number(item.expected);
    if(code&&Number.isSafeInteger(value)&&value>=0){expected[code]=value;totals.expected++;}
   }
   metadataPatch[ek]=expected;
  }
  if(day.remarks.length)metadataPatch[rk]={...(metadataPatch[rk]||live.metadata?.[rk]||{}),[date]:day.remarks};
 }
 // Imported airlines must be visible in the KPI, including LO when present in the workbook.
 const importedCodes=new Set(Object.values(incoming.days).flatMap(day=>day.summary.map(item=>upper(item.airline))));
 if(importedCodes.size){
  const removed=Array.isArray(live.metadata?.flux_bags_removed_expected_airlines)?live.metadata.flux_bags_removed_expected_airlines:[];
  metadataPatch.flux_bags_removed_expected_airlines=removed.filter(code=>!importedCodes.has(upper(code)));
  const extras=Array.isArray(live.metadata?.flux_bags_extra_airlines)?live.metadata.flux_bags_extra_airlines:[];
  metadataPatch.flux_bags_extra_airlines=[...new Set([...extras,...importedCodes])];
 }
 return {updates,metadataPatch,totals};
}
function confirmImport(mode,totals){return new Promise(resolve=>{const dialog=$('importConfirmDialog'),cancel=$('importConfirmCancel'),accept=$('importConfirmAccept');$('importConfirmTitle').textContent=mode==='replace'?'REMPLACER LES JOURNÉES':'METTRE À JOUR LES JOURNÉES';$('importConfirmBody').innerHTML='<p>Vous allez '+(mode==='replace'?'remplacer les dossiers des journées sélectionnées. Les dossiers absents du fichier seront supprimés.':'mettre à jour les dossiers correspondants et ajouter les nouveaux, sans supprimer les autres.')+'</p><div class="import-stats"><div class="import-stat">Journées<strong>'+totals.days+'</strong></div><div class="import-stat">Ajouts<strong>'+totals.added+'</strong></div><div class="import-stat">Modifications<strong>'+totals.changed+'</strong></div><div class="import-stat">Bagages attendus<strong>'+totals.expected+' valeurs</strong></div></div>'+(mode==='replace'?'<div class="import-alert">Attention : les journées importées remplaceront les données actuellement enregistrées.</div>':'')+'<p>Environnement : <strong>TEST uniquement</strong>.</p>';let done=false;const cleanup=()=>{cancel.removeEventListener('click',no);accept.removeEventListener('click',yes);dialog.removeEventListener('close',closed);};const finish=v=>{if(done)return;done=true;cleanup();dialog.close();resolve(v);};const no=()=>finish(false),yes=()=>finish(true),closed=()=>{if(!done){done=true;cleanup();resolve(false);}};cancel.addEventListener('click',no);accept.addEventListener('click',yes);dialog.addEventListener('close',closed);dialog.showModal();cancel.focus();});}
function summarize(){
 if(!incoming||!existing)return;
 const mode=$('mode').value,plan=buildPlan(existing,mode),t=plan.totals;
 $('preview').innerHTML='<b>'+t.days+' journées</b> · '+incoming.total+' lignes dans le fichier · <b>'+t.added+' ajouts</b> · <b>'+t.changed+' modifications</b> · <b>'+t.removed+' suppressions estimées</b> · '+t.expected+' valeurs de bagages attendus.';
 $('conflicts').innerHTML='<p>'+ (mode==='replace'
  ?'<strong>REMPLACER :</strong> les dossiers de chaque journée importée seront remplacés, y compris les dossiers absents du fichier.'
  :'<strong>METTRE À JOUR :</strong> les dossiers sont rapprochés par date, compagnie et TAG ; les autres dossiers restent conservés.')+
  ' Les bagages attendus des récapitulatifs Excel seront enregistrés par date et compagnie.</p>';
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
$('mode').onchange=()=>{if(incoming&&existing)summarize();};
$('file').onchange=async()=>{try{await parseFile($('file').files[0]);}catch(e){incoming=null;$('apply').disabled=true;$('status').textContent='Erreur : '+e.message;}};
$('apply').onclick=async()=>{
 if(!incoming||!existing)return;
 const mode=$('mode').value,verb=mode==='replace'?'REMPLACER':'METTRE À JOUR';
 if(!await confirmImport(mode,buildPlan(existing,mode).totals))return;
 $('apply').disabled=true;
 try{
  const fresh=await fetch('/api/data',{cache:'no-store'});if(!fresh.ok)throw Error('Vérification des données : '+fresh.status);
  const live=await fresh.json();
  for(const date of Object.keys(incoming.days)){
   if(JSON.stringify(live.data?.[date]||[])!==JSON.stringify(existing.data?.[date]||[]))throw Error('La journée '+date+' a changé depuis la prévisualisation. Rechargez le fichier.');
   const month=date.slice(0,7);
   for(const key of ['flux_bags_expected_daily_'+date,'flux_bags_daily_summary_'+month,'flux_bags_remarks_'+month])
    if(JSON.stringify(live.metadata?.[key]||{})!==JSON.stringify(existing.metadata?.[key]||{}))throw Error('Les KPI ont changé depuis la prévisualisation. Rechargez le fichier.');
  }
  const {updates,metadataPatch,totals}=buildPlan(live,mode);
  // Include metadata in the first request even if no dossier was changed.
  const batches=[];for(let i=0;i<updates.length;i+=2)batches.push(updates.slice(i,i+2));
  if(!batches.length)batches.push([]);
  for(let i=0;i<batches.length;i++){
   const res=await fetch('/api/days',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({days:batches[i],metadata:i===0?metadataPatch:{}})});
   if(!res.ok)throw Error('Écriture API '+res.status+' : '+(await res.text()).slice(0,180));
   $('status').textContent='Enregistrement '+(i+1)+' / '+batches.length+'…';
  }
  $('status').textContent='Import '+verb+' terminé : '+totals.added+' ajouts, '+totals.changed+' modifications, '+totals.removed+' suppressions estimées, '+totals.expected+' valeurs de bagages attendus mises à jour. Rechargez le tableau pour voir les résultats.';
  existing=null;incoming=null;$('apply').disabled=true;
 }catch(e){$('status').textContent='IMPORT INTERROMPU : '+e.message+' (certaines journées ont pu être enregistrées). Rechargez le fichier avant de recommencer.';}finally{if(incoming)$('apply').disabled=false;}
};
