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
  for(let i=11;i<=23;i++){const r=sheet.getRow(i),code=upper(r.getCell(3).text);if(!/^[A-Z0-9]{2,3}$/.test(code))continue;const obj={airline:code};summaryKeys.forEach((k,j)=>{const v=r.getCell(j+4).value;obj[k]=typeof v==='number'?v:Number(clean(r.getCell(j+4).text).replace(',','.'))||0;});summary.push(obj);}
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
function summarize(){
 if(!incoming||!existing)return;
 let missing=0;
 for(const [date,day] of Object.entries(incoming.days))missing+=missingRows(date,day.records,existing.data?.[date]||[]).length;
 incoming.missing=missing;
 $('preview').innerHTML='<b>'+Object.keys(incoming.days).length+' journées</b> · '+incoming.total+' lignes · <b>'+missing+' lignes restant à importer</b> · '+(incoming.total-missing)+' lignes déjà présentes.';
 $('conflicts').innerHTML='<p>Les lignes Excel sont conservées individuellement, y compris les doublons de date, compagnie et tag. Les lignes déjà importées à l’identique ne seront pas réajoutées.</p>';
 $('apply').disabled=missing===0;
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
$('apply').onclick=async()=>{
 if(!incoming||!existing)return;
 if(!confirm('Importer uniquement les lignes manquantes sur TEST, en conservant tous les doublons Excel ?'))return;
 $('apply').disabled=true;
 try{
  const fresh=await fetch('/api/data',{cache:'no-store'});if(!fresh.ok)throw Error('Vérification des données : '+fresh.status);
  const live=await fresh.json();
  for(const date of Object.keys(incoming.days))if(JSON.stringify(live.data?.[date]||[])!==JSON.stringify(existing.data?.[date]||[]))throw Error('La journée '+date+' a changé depuis la prévisualisation. Rechargez le fichier.');
  const updates=[];let added=0;
  for(const [date,day] of Object.entries(incoming.days)){
   const old=live.data?.[date]||[],missing=missingRows(date,day.records,old);
   if(missing.length){updates.push({date,records:[...old,...missing]});added+=missing.length;}
  }
  if(!updates.length){$('status').textContent='Toutes les '+incoming.total+' lignes Excel sont déjà présentes. Aucune modification.';return;}
  // Add missing daily summaries/remarks, but never overwrite existing KPI or remarks.
  const metadataPatch={};for(const [date,day] of Object.entries(incoming.days)){const month=date.slice(0,7),sk='flux_bags_daily_summary_'+month,rk='flux_bags_remarks_'+month;const oldSummary=live.metadata?.[sk]||{},oldRemarks=live.metadata?.[rk]||{};if(!Object.prototype.hasOwnProperty.call(oldSummary,date)&&day.summary.length){metadataPatch[sk]={...(metadataPatch[sk]||oldSummary),[date]:day.summary};}if(!Object.prototype.hasOwnProperty.call(oldRemarks,date)&&day.remarks.length){metadataPatch[rk]={...(metadataPatch[rk]||oldRemarks),[date]:day.remarks};}}
  for(let i=0;i<updates.length;i+=2){const slice=updates.slice(i,i+2);const res=await fetch('/api/days',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({days:slice,metadata:i===0?metadataPatch:{}})});if(!res.ok)throw Error('Écriture API '+res.status+' : '+(await res.text()).slice(0,180));$('status').textContent='Journées enregistrées : '+Math.min(i+2,updates.length)+' / '+updates.length;}
  $('status').textContent='Import terminé : '+added+' lignes ajoutées, 0 dossier existant modifié, 0 doublon Excel supprimé. Les récapitulatifs existants ont été préservés ; les récapitulatifs manquants ont été ajoutés.';
  existing=null;incoming=null;$('apply').disabled=true;
 }catch(e){$('status').textContent='IMPORT INTERROMPU : '+e.message+' (certaines journées ont pu être enregistrées). Rechargez le fichier avant de recommencer.';}finally{if(incoming)$('apply').disabled=false;}
};
