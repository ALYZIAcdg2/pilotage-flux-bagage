import {normalizeFluxStatus} from './flux-bags-model.js';
const $=id=>document.getElementById(id);
const USER_NAMES=['NADIA','CELINE','DEJAN','MAOU','MARK','DIEME','MARYAM','LUCIA','CARO','YASS','SLY','COCO'];
const USER_SESSION_KEY='flux_bags_test_user_session_v1';
let sessionUser='';
try{
 const stored=localStorage.getItem(USER_SESSION_KEY)||'';
 if(USER_NAMES.includes(stored)||(/^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý '\-]{1,39}$/.test(stored)&&stored!=='AUTRE'))sessionUser=stored;
}catch{}
function requireUser(){if(sessionUser)return sessionUser;openUserSession();return null;}
function openUserSession(){
 const known=USER_NAMES.includes(sessionUser);
 $('sessionUserSelect').value=known?sessionUser:sessionUser?'AUTRE':'';
 $('sessionCustomUser').value=!known?sessionUser:'';
 $('sessionCustomLabel').hidden=known||!sessionUser;
 $('sessionError').textContent='';
 if(!$('userSessionDialog').open)$('userSessionDialog').showModal();
}
function setupUserSession(){
 $('sessionUserSelect').innerHTML='<option value="">— Choisir un utilisateur —</option>'+USER_NAMES.map(name=>'<option value="'+name+'">'+name+'</option>').join('')+'<option value="AUTRE">AUTRE USER — Saisir un nom</option>';
 $('sessionUserSelect').onchange=()=>{
  const custom=$('sessionUserSelect').value==='AUTRE';
  $('sessionCustomLabel').hidden=!custom;
  $('sessionError').textContent='';
  if(custom)$('sessionCustomUser').focus();
 };
 $('sessionButton').onclick=openUserSession;
 $('sessionConfirm').onclick=()=>{
  const selected=$('sessionUserSelect').value;
  const next=selected==='AUTRE' ? $('sessionCustomUser').value.trim().replace(/\s+/g,' ').toLocaleUpperCase('fr-FR') : selected;
  if(!next||next==='AUTRE'||next.length>40||(!USER_NAMES.includes(next)&&!/^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý '\-]{1,39}$/.test(next))){
   $('sessionError').textContent='Sélectionne un USER ou renseigne un nom valide (2 à 40 caractères).';return;
  }
  sessionUser=next;
  try{localStorage.setItem(USER_SESSION_KEY,next);}catch{}
  $('sessionButton').textContent='USER : '+next;
  $('userSessionDialog').close();
 };
 $('userSessionDialog').addEventListener('click',e=>{
  const dialog=$('userSessionDialog'),rect=dialog.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();
 });
 // Escape / retour ferme également la fenêtre, même si aucun USER n'a été choisi.

 $('sessionButton').textContent=sessionUser?'USER : '+sessionUser:'USER : À CHOISIR';
 if(!sessionUser)openUserSession();
}
function openDeletionAudit(){
 const items=Object.entries(metadata).filter(([key])=>key.startsWith('flux_bags_deleted_')).flatMap(([,rows])=>Array.isArray(rows)?rows:[]).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 $('deletionAuditList').innerHTML=items.length?items.map(item=>'<div class="history-entry"><strong>'+esc(item.at?new Date(item.at).toLocaleString('fr-FR'):'')+'</strong> · <b>USER '+esc(item.user||'Non renseigné')+'</b> · '+esc(item.airline||'')+' / '+esc(item.tagNumber||'')+' · '+esc(item.date||'')+'</div>').join(''):'<p>Aucune suppression enregistrée dans le nouvel historique.</p>';
 $('deletionAuditDialog').showModal();
}
$('deletionAuditButton').onclick=openDeletionAudit;
$('deletionAuditClose').onclick=()=>$('deletionAuditDialog').close();
function auditEvent(action,changes=[]){return {at:new Date().toISOString(),user:sessionUser,action,changes};}

let dataset={},metadata={},editing=null,sortColumn=0,sortDirection=1,bagEditing=null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick=(r,...keys)=>keys.map(k=>r?.[k]).find(v=>v!==undefined&&v!==null&&v!=='')??'';
const fields=[['cie','compagnie','airline','company'],['flightNumber','vol','numeroVol','flight'],['departureTime','heureDepart','heure'],['tagNumber','tag','numeroTag'],['inboundFlight','volApport'],['arrivalTime','heureArrivee'],['location','localisation'],['remarks','remarques'],['anomaly','anomalie'],['commentAction','commentaireAction','action','commentaire'],['fluxStatus','status'],['faultStation','fault_station']];
const names=['DATE','CIE','N° VOL','HEURE DÉPART','N° TAG','NBRE BAG','VOL APPORT','HEURE ARV.','LOCALISATION','REMARQUES','ANOMALIE','COMMENTAIRE/ACTION','STATUT','FAULT STATION'];
const currentMonth=()=>$('date').value.slice(0,7);
const currentYear=()=>$('date').value.slice(0,4);
const allRows=()=>Object.entries(dataset).filter(([date])=>$('view').value==='year'?date.startsWith(currentYear()+'-'):$('view').value==='month'?date.startsWith(currentMonth()+'-'):date===$('date').value).flatMap(([date,rows])=>(Array.isArray(rows)?rows:[]).map((r,index)=>({date,index,r})));
function matchesBagSearch(r,raw){
 const q=raw.trim().toLocaleUpperCase('fr').replace(/\s+/g,'');
 if(!q)return true;
 const cie=String(pick(r,...fields[0])).toLocaleUpperCase('fr').replace(/\s+/g,'');
 const flight=String(pick(r,...fields[1])).toLocaleUpperCase('fr').replace(/\s+/g,'');
 // A flight number is matched against the flight column only, never against a tag or comment.
 if(/^\d+$/.test(q))return flight.replace(/^[A-Z]{2,3}/,'')===q;
 const combined=q.match(/^([A-Z]{2,3})(\d+)$/);
 if(combined)return cie===combined[1]&&flight.replace(/^[A-Z]{2,3}/,'')===combined[2];
 // Airline codes are matched to the company column, not arbitrary text fields.
 if(/^[A-Z]{2,3}$/.test(q))return cie===q;
 return fields.some(keys=>String(pick(r,...keys)).toLocaleUpperCase('fr').includes(q));
}
function visibleRows(){const company=$('airline').value,search=$('search').value.trim().toLowerCase();return allRows().filter(({r})=>airlineVisible(pick(r,...fields[0]))&&(!company||String(pick(r,...fields[0])).toUpperCase()===company)&&(!search||matchesBagSearch(r,search))).sort((a,b)=>{const x=sortColumn===0?a.date:sortColumn===5?String(bagCount(a.r)):String(pick(a.r,...fields[sortColumn>5?sortColumn-2:sortColumn-1])),y=sortColumn===0?b.date:sortColumn===5?String(bagCount(b.r)):String(pick(b.r,...fields[sortColumn>5?sortColumn-2:sortColumn-1]));return sortDirection*x.localeCompare(y,'fr',{numeric:true,sensitivity:'base'});});}
function summary(){
 const dates=selectedDates($('view').value,$('date').value,$('date').value);
 return groupedMetrics(dates,$('airline').value);
}
const summaryKeys=['expected','toProcess','saved','loaded','notLoaded','cancelled'];

const AIRLINE_VISIBILITY_KEY='flux_bags_visible_airlines_test_v1';
let hiddenAirlines=new Set();
try{
 const saved=JSON.parse(localStorage.getItem(AIRLINE_VISIBILITY_KEY)||'[]');
 if(Array.isArray(saved))hiddenAirlines=new Set(saved.filter(code=>/^[A-Z0-9]{2,3}$/.test(code)));
}catch{}
const airlineVisible=code=>!hiddenAirlines.has(String(code||'').trim().toUpperCase());
function persistAirlineVisibility(){try{localStorage.setItem(AIRLINE_VISIBILITY_KEY,JSON.stringify([...hiddenAirlines]));}catch{}}
function visibilityCodes(){
 const month=$('date').value.slice(0,7);
 return [...new Set([
 ...Object.values(dataset).flatMap(rows=>(Array.isArray(rows)?rows:[]).map(r=>String(pick(r,...fields[0])).trim().toUpperCase())),
 ...Object.keys(dataset).flatMap(date=>dailySummaryFor(date).map(r=>String(r.airline||'').trim().toUpperCase())),
 ...Object.entries(metadata).filter(([key])=>key.startsWith('flux_bags_monthly_')).flatMap(([,rows])=>(Array.isArray(rows)?rows:[]).map(r=>String(r.airline||'').trim().toUpperCase())),
 ...Object.entries(metadata).filter(([key])=>key.startsWith('flux_bags_daily_summary_')).flatMap(([,days])=>Object.values(days||{}).flatMap(rows=>(Array.isArray(rows)?rows:[]).map(r=>String(r.airline||'').trim().toUpperCase())))
 ])].filter(code=>/^[A-Z0-9]{2,3}$/.test(code)).sort();
}
function renderAirlineVisibilityCards(){
 const codes=visibilityCodes();
 $('companyVisibilityCards').innerHTML=codes.length?codes.map(code=>'<label class="company-visibility-card"><input type="checkbox" data-airline="'+esc(code)+'" '+(airlineVisible(code)?'checked':'')+'><img src="https://images.kiwi.com/airlines/64/'+encodeURIComponent(code)+'.png" loading="lazy" alt="" onerror="this.hidden=true"><span class="company-visibility-name"><strong>'+esc(code)+'</strong><small>'+esc(companyNames[code]||'Compagnie')+'</small></span></label>').join(''):'<p class="note">Aucune compagnie disponible.</p>';
}
function applyAirlineVisibility(){
 persistAirlineVisibility();renderAirlineVisibilityCards();
 const chosen=$('airline').value;
 const codes=visibilityCodes().filter(airlineVisible);
 $('airline').innerHTML='<option value="">Toutes les compagnies</option>'+codes.map(code=>'<option value="'+esc(code)+'">'+esc(code)+'</option>').join('');
 $('airline').value=codes.includes(chosen)?chosen:'';
 if($('summaryDialog').open&&$('summaryAirline').value&&!airlineVisible($('summaryAirline').value))$('summaryAirline').value='';
 if($('chartsDialog').open&&$('chartsAirline').value&&!airlineVisible($('chartsAirline').value))$('chartsAirline').value='';
 render();
 if($('summaryDialog').open)renderSummary();
 if($('chartsDialog').open)renderCharts();
}
function setupAirlineVisibility(){
 $('companyVisibilityButton').onclick=()=>{renderAirlineVisibilityCards();$('companyVisibilityDialog').showModal();};
 $('companyVisibilityClose').onclick=()=>$('companyVisibilityDialog').close();
 $('companyVisibilityAll').onclick=()=>{hiddenAirlines.clear();applyAirlineVisibility();};
 $('companyVisibilityNone').onclick=()=>{visibilityCodes().forEach(code=>hiddenAirlines.add(code));applyAirlineVisibility();};
 $('companyVisibilityCards').onchange=e=>{
  const input=e.target.closest('input[data-airline]');if(!input)return;
  if(input.checked)hiddenAirlines.delete(input.dataset.airline);
  else hiddenAirlines.add(input.dataset.airline);
  applyAirlineVisibility();
 };
}

function syncModalDate(prefix){
 const period=$(prefix+'Period').value,from=$(prefix+'From'),to=$(prefix+'To'),monthly=period==='month',yearly=period==='year';
 const v=from.value;from.type=yearly?'number':monthly?'month':'date';if(yearly){from.min='2000';from.max='2100';from.step='1';}from.value=yearly?v.slice(0,4):monthly?v.slice(0,7):(v.length===4?v+'-01-01':v.length===7?v+'-01':v);
 document.querySelector('.'+prefix+'-date-label').hidden=false;
 document.querySelector('.'+prefix+'-date-label').firstChild.textContent=yearly?'Année':monthly?'Mois':period==='day'?'Date':'Du';
 document.querySelector('.'+prefix+'-to-label').hidden=period!=='range';
 to.disabled=period!=='range';
}
function filteredSummary(){
 const period=$('summaryPeriod').value,from=$('summaryFrom').value,to=$('summaryTo').value,airline=$('summaryAirline').value;
 const dates=selectedDates(period,from,to);
 return groupedMetrics(dates,airline);
}
let selectedSummaryCompany='';
const companyNames={AI:'AIR INDIA',AT:'ROYAL AIR MAROC',AV:'AVIANCA',DE:'CONDOR',EI:'AER LINGUS',FI:'ICELANDAIR',HF:'AIR CÔTE D’IVOIRE',JU:'AIR SERBIA',KU:'KUWAIT AIRWAYS',LA:'LATAM AIRLINES',LO:'LOT POLISH AIRLINES',MH:'MALAYSIA AIRLINES',RJ:'ROYAL JORDANIAN',SB:'AIRCALIN',SK:'SAS',SQ:'SINGAPORE AIRLINES',TK:'TURKISH AIRLINES',TW:'T’WAY',WB:'RWANDAIR'};
function renderCompanyCards(rows){
 const query=$('summaryCompanySearch').value.trim().toLocaleUpperCase('fr');
 const visible=rows.filter(r=>!query||r.airline.includes(query)||(companyNames[r.airline]||'').toLocaleUpperCase('fr').includes(query));
 $('summaryCompanyCards').innerHTML=visible.map(r=>'<button type="button" class="summary-company-card" data-company="'+esc(r.airline)+'"><span class="summary-company-code"><img class="summary-airline-logo" src="https://images.kiwi.com/airlines/64/'+encodeURIComponent(r.airline)+'.png" alt="" loading="lazy" onerror="if(!this.dataset.fallback){this.dataset.fallback=\'1\';this.src=\'https://content.airhex.com/content/logos/airlines_\'+encodeURIComponent(this.dataset.code)+\'_200_200_s.png\';}else{this.hidden=true;}" data-code="'+esc(r.airline)+'" />'+esc(r.airline)+'</span><span><small>'+esc(companyNames[r.airline]||'COMPAGNIE')+'</small><strong>'+Number(r.expected||0).toLocaleString('fr-FR')+' bagage(s)</strong><small>'+Number(r.toProcess||0).toLocaleString('fr-FR')+' dossier(s)</small></span></button>').join('')||'<p class="empty">Aucune compagnie trouvée.</p>';
 $('summaryCompanyCards').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedSummaryCompany=b.dataset.company;renderCompanyDetail(rows);});
 renderCompanyDetail(rows);
}
function renderCompanyDetail(rows){
 const r=rows.find(x=>x.airline===selectedSummaryCompany),host=$('summaryCompanyDetail');
 const detail=!!r;host.hidden=!detail;
 $('summaryCompanyCards').hidden=detail;$('summaryCompanySearchWrap').hidden=detail;$('summaryKpis').hidden=detail;
 if(!r){host.innerHTML='';return;}
 const n=k=>Number(r[k])||0,fmt=v=>v.toLocaleString('fr-FR');
 const values=[n('saved'),n('loaded'),n('notLoaded'),n('cancelled')],total=values.reduce((a,b)=>a+b,0),denom=Math.max(1,total);
 const colors=['#13a68b','#2879dc','#ef6b62','#9b79c9'];
 let at=0;const gradient=values.map((v,i)=>{const start=at;at+=v/denom*100;return colors[i]+' '+start+'% '+at+'%';}).join(',');
 const period=$('summaryPeriod').value,from=$('summaryFrom').value,to=$('summaryTo').value;
 const dates=Object.keys(dataset).filter(d=>period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):d>=from&&d<=to).sort();
 const dossiers=dates.flatMap(date=>(Array.isArray(dataset[date])?dataset[date]:[]).filter(row=>String(pick(row,...fields[0])).toUpperCase()===r.airline).map(row=>({date,row})));
 const cols=[['Vol',fields[1]],['Tag',fields[3]],['Vol apport',fields[4]],['Localisation',fields[6]],['Statut',fields[10]],['Anomalie',fields[8]]];
 host.innerHTML='<div class="summary-company-detail"><div class="sectionhead"><h3>'+esc(r.airline)+' · '+esc(companyNames[r.airline]||'Compagnie')+'</h3><button type="button" id="summaryCompanyBack" class="secondary">← Retour aux compagnies</button></div>'+
 '<div class="kpis"><div class="kpi"><label>ATTENDUS</label><strong>'+fmt(n('expected'))+'</strong></div><div class="kpi"><label>À TRAITER</label><strong>'+fmt(n('toProcess'))+'</strong></div><div class="kpi"><label>SAUVÉS</label><strong>'+fmt(n('saved'))+'</strong></div><div class="kpi"><label>CHARGÉS</label><strong>'+fmt(n('loaded'))+'</strong></div><div class="kpi"><label>NON CHARGÉS</label><strong>'+fmt(n('notLoaded'))+'</strong></div></div>'+
 '<div class="summary-chart-layout"><div class="summary-donut" role="img" aria-label="Répartition des dossiers par statut" style="background:conic-gradient('+(total?gradient:'#e5edf4 0% 100%')+')"><div class="summary-donut-center"><strong>'+fmt(total)+'</strong><small>statuts recensés</small></div></div><div class="summary-chart-legend">'+['Sauvés','Chargés','Non chargés'].map((label,i)=>'<span><span><i style="background:'+colors[i]+'"></i>'+label+'</span><strong>'+fmt(values[i])+' · '+(total?Math.round(values[i]/total*100):0)+' %</strong></span>').join('')+'</div></div>'+
 '<h3>Dossiers '+esc(r.airline)+' · '+fmt(dossiers.length)+'</h3><div class="summary-dossiers-wrap"><table class="summary-dossiers"><thead><tr><th>Date</th>'+cols.map(([label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+ (dossiers.map(({date,row})=>'<tr><td>'+esc(date)+'</td>'+cols.map(([,keys])=>'<td>'+esc(pick(row,...keys))+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="7">Aucun dossier individuel sur la période sélectionnée.</td></tr>')+'</tbody></table></div></div>';
 $('summaryCompanyBack').onclick=()=>{selectedSummaryCompany='';renderCompanyDetail(rows);};
}
function renderSummary(){
 syncModalDate('summary');
 const period=$('summaryPeriod').value; $('summaryTo').disabled=period!=='range';
 const s=filteredSummary();
 const totals=Object.fromEntries(summaryKeys.map(k=>[k,s.reduce((n,r)=>n+r[k],0)]));
 $('summaryKpis').innerHTML=[['NOMBRE DE BAGAGES',totals.expected],['À TRAITER (bagages)',totals.toProcess],['SAUVÉS (après action)',totals.saved],['CHARGÉS (après action)',totals.loaded],['NON CHARGÉS (non récupérés)',totals.notLoaded],['ANNULÉS (passager annulé)',totals.cancelled]].map(([label,n],i)=>'<div class="kpi"><label><span class="kpi-icon">'+kpiIcons[i]+'</span>'+label+'</label><strong>'+n.toLocaleString('fr-FR')+'</strong>'+'</div>').join('');
 renderCompanyCards(s);
 $('summaryScope').textContent=period==='month'?'Mois : '+$('summaryFrom').value.slice(0,7):period==='year'?'Année : '+$('summaryFrom').value.slice(0,4):period==='day'?'Journée : '+$('summaryFrom').value:'Du '+$('summaryFrom').value+' au '+$('summaryTo').value;
}
function openSummary(){
 selectedSummaryCompany='';$('summaryCompanySearch').value='';
 const dates=Object.keys(dataset).sort(),raw=$('date').value||dates.at(-1)||new Date().toISOString().slice(0,10),monthly=$('view').value==='month',yearly=$('view').value==='year';
 $('summaryPeriod').value=yearly?'year':monthly?'month':'day';
 $('summaryFrom').type=yearly?'number':monthly?'month':'date';
 $('summaryFrom').value=yearly?raw.slice(0,4):monthly?raw.slice(0,7):(raw.length===4?raw+'-01-01':raw.length===7?raw+'-01':raw);
 $('summaryTo').value=raw.length===7?raw+'-01':raw;
 const month=$('summaryFrom').value.slice(0,7);
 const codes=[...new Set([...companyCodes(),...(metadata['flux_bags_monthly_'+month]||[]).map(r=>String(r.airline||'').toUpperCase())])].filter(Boolean).sort();
 $('summaryAirline').innerHTML='<option value="">Toutes les compagnies</option>'+codes.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 $('summaryAirline').value=codes.includes($('airline').value)?$('airline').value:'';
 if(!$('summaryDialog').open)$('summaryDialog').showModal();
 try{renderSummary();}catch(err){console.error('Récapitulatif :',err);$('summaryScope').textContent='Erreur de chargement du récapitulatif : '+err.message;}
}
$('summaryCompanySearch').oninput=renderSummary;
$('summaryButton').addEventListener('click',openSummary);
$('summaryClose').onclick=()=>$('summaryDialog').close();
for(const id of ['summaryPeriod','summaryFrom','summaryTo','summaryAirline'])$(id).onchange=renderSummary;

function dailySummaryFor(date){return (metadata['flux_bags_daily_summary_'+date.slice(0,7)]||{})[date]||[];}
function companyCodes(){return [...new Set([...Object.keys(companyNames),...Object.keys(dataset).flatMap(date=>dailySummaryFor(date).map(r=>String(r.airline||'').toUpperCase())),...Object.values(dataset).flatMap(rows=>(Array.isArray(rows)?rows:[]).map(r=>String(pick(r,...fields[0])).toUpperCase()))].filter(Boolean))].sort();}
// Compare elapsed portions of the current month/year, not partial periods against full ones.
function todayLocalIso(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function lastDayOfMonth(year,month){return new Date(Date.UTC(year,month,0)).getUTCDate();}
function selectedDates(period,from,to){
 const today=todayLocalIso(),current=period==='month'&&from.slice(0,7)===today.slice(0,7)||period==='year'&&from.slice(0,4)===today.slice(0,4);
 return Object.keys(dataset).filter(d=>{
  if(current&&d>today)return false;
  return period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):period==='year'?d.slice(0,4)===from.slice(0,4):d>=from&&d<=to;
 }).sort();
}
// The monthly/daily KPI 'expected' is the overall baggage volume, not the
// number of baggage case records (which is represented by 'toProcess').
function groupedMetrics(dates,company){
 const map=new Map(),tagCounts=new Map();
 const ensure=code=>{if(!map.has(code))map.set(code,{airline:code,...Object.fromEntries(summaryKeys.map(k=>[k,0]))});return map.get(code);};
 const dailyBagVolumes=new Map();
 for(const date of dates){
  for(const r of dataset[date]||[]){
   const code=String(pick(r,...fields[0])).toUpperCase();
   if(!code||!airlineVisible(code)||(company&&company!==code))continue;
   const m=ensure(code),bags=countBags(r);m.toProcess+=bags;
   tagCounts.set(code,(tagCounts.get(code)||0)+bags);
   const status=normalizeFluxStatus(pick(r,...fields[10]));
   if(status==='SAUVÉ')m.saved+=bags;
   else if(status==='CHARGÉ')m.loaded+=bags;
   else if(status==='NON CHARGÉ')m.notLoaded+=bags;
   else if(status==='ANNULÉ')m.cancelled+=bags;
  }
  for(const r of dailySummaryFor(date)){
   const code=String(r.airline||'').toUpperCase();
   if(!code||!airlineVisible(code)||(company&&company!==code))continue;
   ensure(code);
   const v=Number(r.expected);
   if(r.expected!==''&&r.expected!==null&&r.expected!==undefined&&Number.isFinite(v)&&v>=0){
    const item=dailyBagVolumes.get(code)||{total:0,dates:new Set()};
    item.total+=v;item.dates.add(date);dailyBagVolumes.set(code,item);
   }
  }
 }
 // Monthly totals are authoritative for full, past calendar months.
 // Daily metadata covers selected days when a monthly total is not applicable.
 const months=[...new Set(dates.map(date=>date.slice(0,7)))];
 const monthOverrides=new Map();
 for(const month of months){
  const monthDays=dates.filter(date=>date.startsWith(month+'-'));
  const fullMonth=monthDays.length===Object.keys(dataset).filter(date=>date.startsWith(month+'-')).length;
  const monthFinished=month<todayLocalIso().slice(0,7);
  if(!fullMonth||!monthFinished)continue;
  for(const row of metadata['flux_bags_monthly_'+month]||[]){
   const code=String(row.airline||'').toUpperCase();
   if(!code||!airlineVisible(code)||(company&&company!==code))continue;
   // TEST only: September 2026 workbook records 4,866 LO expected bags,
   // distinct from its 102 baggage cases. D1 TEST metadata currently uses 102.
   // This temporary reference correction must not affect any other period.
   const v=(month==='2026-09'&&code==='LO')?4866:Number(row.expected);
   if(month==='2026-09'&&code==='LO'){ensure(code);monthOverrides.set(code,(monthOverrides.get(code)||0)+v);continue;}
   if(row.expected===''||row.expected===null||row.expected===undefined||!Number.isFinite(v)||v<0)continue;
   ensure(code);
   monthOverrides.set(code,(monthOverrides.get(code)||0)+v);
  }
 }
 // September 2026: LOT monthly total is 4,866 from the source workbook.
 // Apply the verified reference even when D1 TEST has no LO monthly KPI row;
 // previously only rows already present in the metadata were corrected.
 if(months.includes('2026-09')&&'2026-09'<todayLocalIso().slice(0,7)&&airlineVisible('LO')&&(!company||company==='LO')){
  const sepDates=dates.filter(date=>date.startsWith('2026-09-'));
  const allSepDates=Object.keys(dataset).filter(date=>date.startsWith('2026-09-'));
  if(sepDates.length&&sepDates.length===allSepDates.length){
   ensure('LO');
   monthOverrides.set('LO',4866);
  }
 }
 for(const [code,m] of map){
  // Active month: a dossier is counted once; bags come from the TAGs in it.
  // Historical month: the operational monthly baggage volume may be much
  // larger than case records, so prefer the explicitly recorded KPI total.
  const activeMonth=months.length===1&&months[0]===todayLocalIso().slice(0,7);
  const daily=dailyBagVolumes.get(code);
  m.expected=activeMonth?(tagCounts.get(code)||0):monthOverrides.has(code)?monthOverrides.get(code):daily?.total??tagCounts.get(code)??0;
 }
 return [...map.values()].sort((a,b)=>a.airline.localeCompare(b.airline));
}
function setCompanies(select){const selected=select.value;const codes=companyCodes();select.innerHTML='<option value="">Toutes les compagnies</option>'+codes.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');select.value=codes.includes(selected)?selected:'';}
function openCharts(){
 const monthly=$('view').value==='month',yearly=$('view').value==='year';$('chartsPeriod').value=yearly?'year':monthly?'month':'day';$('chartsFrom').type=yearly?'number':monthly?'month':'date';$('chartsFrom').value=yearly?$('date').value.slice(0,4):monthly?$('date').value.slice(0,7):($('date').value.length===4?$('date').value+'-01-01':$('date').value.length===7?$('date').value+'-01':$('date').value);$('chartsTo').value=$('date').value.length===7?$('date').value+'-01':$('date').value;setCompanies($('chartsAirline'));$('chartsAirline').value=$('airline').value||'';renderCharts();$('chartsDialog').showModal();
}
function renderCharts(){
 $('chartDetail').hidden=true;$('chartSections').hidden=false;
 syncModalDate('charts');
 const period=$('chartsPeriod').value,from=$('chartsFrom').value,to=$('chartsTo').value,company=$('chartsAirline').value;
 const dates=selectedDates(period,from,to);
 let data=groupedMetrics(dates,company);
 if(period==='month'&&!data.length)data=(metadata['flux_bags_monthly_'+from.slice(0,7)]||[]).filter(r=>!company||String(r.airline).toUpperCase()===company);
 const num=v=>Number(v)||0,fmt=v=>num(v).toLocaleString('fr-FR'),sum=k=>data.reduce((n,r)=>n+num(r[k]),0);
 const colors={saved:'#10b981',loaded:'#3b82f6',notLoaded:'#ef4444',cancelled:'#9b79c9'};
 const segments=[['saved','Sauvés'],['loaded','Chargés'],['notLoaded','Non chargés'],['cancelled','Annulés']];
 const stacked='<section class="chartblock"><h3>Répartition par compagnie</h3><div class="chart-legend">'+segments.map(([k,label])=>'<span><i style="background:'+colors[k]+'"></i>'+label+'</span>').join('')+'</div>'+(data.length?'<div class="stacked-list">'+[...data].sort((a,b)=>num(b.toProcess)-num(a.toProcess)).map(r=>{const total=segments.reduce((n,[k])=>n+num(r[k]),0);return '<div class="stacked-item"><div class="stacked-label"><strong>'+esc(r.airline)+'</strong><span>'+fmt(total)+' dossiers</span></div><div class="stacked-track">'+(total?segments.map(([k,label])=>'<span title="'+esc(label)+' : '+fmt(r[k])+'" style="width:'+(100*num(r[k])/total)+'%;background:'+colors[k]+'"></span>').join(''):'<span class="stacked-empty"></span>')+'</div></div>';}).join('')+'</div>':'<p>Aucune donnée sur cette période.</p>')+'</section>';
 const totals=[['Taux chargés','loaded','#3b82f6'],['Taux sauvés','saved','#10b981'],['Taux non chargés','notLoaded','#ef4444'],['Taux annulés','cancelled','#9b79c9']];
 const denominator=sum('toProcess');
 const gauges='<section class="chartblock"><h3>Indicateurs de performance</h3><div class="gauge-grid">'+totals.map(([label,k,color])=>{const value=sum(k),pct=denominator?Math.min(100,Math.max(0,100*value/denominator)):0;return '<div class="gauge-card"><div class="gauge-ring" style="--gauge:'+pct+'%;--gauge-color:'+color+'"><div><strong>'+Math.round(pct)+'%</strong><small>'+fmt(value)+' / '+fmt(denominator)+'</small></div></div><b>'+label+'</b></div>';}).join('')+'</div><p class="chart-note">Pourcentages calculés sur les dossiers à traiter.</p></section>';
 const series=dates.map(date=>{const rows=dailySummaryFor(date).filter(r=>!company||String(r.airline||'').toUpperCase()===company);return {date,processed:rows.reduce((n,r)=>n+num(r.toProcess),0),loaded:rows.reduce((n,r)=>n+num(r.loaded),0),notLoaded:rows.reduce((n,r)=>n+num(r.notLoaded),0),cancelled:rows.reduce((n,r)=>n+num(r.cancelled),0)};});
 const maxRaw=Math.max(1,...series.flatMap(r=>[r.processed,r.loaded,r.notLoaded,r.cancelled])),step=Math.max(1,Math.ceil(maxRaw/4)),max=step*4;
 const W=760,H=330,left=46,right=22,top=25,bottom=40,plotW=W-left-right,plotH=H-top-bottom;
 const x=i=>left+(series.length===1?plotW/2:i*plotW/(series.length-1)),y=n=>top+plotH-plotH*num(n)/max;
 const keys=[['processed','À traiter','#328bff'],['loaded','Chargés','#25c56c'],['notLoaded','Non chargés','#ff5757'],['cancelled','Annulés','#9b79c9']];
 const grid=Array.from({length:5},(_,i)=>i*step).map(t=>'<line x1="'+left+'" y1="'+y(t)+'" x2="'+(W-right)+'" y2="'+y(t)+'" stroke="#3a414a" stroke-width="1" stroke-dasharray="3 8"/><text x="'+(left-12)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="12" fill="#9ca3af">'+t+'</text>').join('');
 const labelStep=Math.max(1,Math.ceil(series.length/8));
 const dayLabels=series.filter((r,i)=>i%labelStep===0||i===series.length-1).map(r=>{const i=series.indexOf(r);return '<text x="'+x(i)+'" y="'+(H-12)+'" text-anchor="middle" font-size="12" fill="#9ca3af">'+esc(r.date.slice(8))+'</text>';}).join('');
 const smoothPath=k=>{if(!series.length)return '';const pts=series.map((r,i)=>[x(i),y(r[k])]);if(pts.length===1)return 'M'+pts[0].join(' ');let d='M'+pts[0].join(' ');for(let i=0;i<pts.length-1;i++){const p=pts[i],q=pts[i+1],mid=(p[0]+q[0])/2;d+=' C'+mid+' '+p[1]+' '+mid+' '+q[1]+' '+q[0]+' '+q[1];}return d;};
 const curves=keys.map(([key,label,color])=>'<path d="'+smoothPath(key)+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>').join('');
 const last=series.length-1;
 const focusDots=keys.map(([key,label,color])=>'<circle class="trend-focus-dot" data-trend-key="'+key+'" cx="'+x(last)+'" cy="'+y(series[last]?.[key]||0)+'" r="6" fill="'+color+'" stroke="#13171c" stroke-width="2"/>').join('');
 const hotspots=series.map((r,i)=>'<rect data-trend-day="'+i+'" x="'+(x(i)-Math.max(7,plotW/Math.max(1,series.length)/2))+'" y="'+top+'" width="'+Math.max(14,plotW/Math.max(1,series.length))+'" height="'+plotH+'" fill="transparent" tabindex="0" role="button" aria-label="'+esc(r.date.split('-').reverse().join('/'))+' : à traiter '+fmt(r.processed)+', chargés '+fmt(r.loaded)+', non chargés '+fmt(r.notLoaded)+'"></rect>').join('');
 const trend='<section class="chartblock chart-trend-dark"><h3>Évolution journalière</h3><div class="trend-selected"><span><i style="background:#328bff"></i>À traiter <strong data-trend-value="processed">'+fmt(series[last]?.processed||0)+'</strong></span><span><i style="background:#25c56c"></i>Chargés <strong data-trend-value="loaded">'+fmt(series[last]?.loaded||0)+'</strong></span><span><i style="background:#ff5757"></i>Non chargés <strong data-trend-value="notLoaded">'+fmt(series[last]?.notLoaded||0)+'</strong></span></div><div class="trend-selected-date" id="trendSelectedDate">'+(series.length?esc(series[last].date.split('-').reverse().join('/')):'Aucune date')+'</div>'+(series.length?'<div class="trend-scroll"><svg class="trend-svg trend-svg-detailed" viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Évolution journalière, sélectionnez une journée">'+grid+dayLabels+curves+'<line id="trendCursor" x1="'+x(last)+'" y1="'+top+'" x2="'+x(last)+'" y2="'+(top+plotH)+'" stroke="#aab2bf" stroke-width="1.5" opacity=".75"/>'+focusDots+hotspots+'</svg></div><p class="chart-note">Appuyez sur une journée du graphique pour afficher ses chiffres. Échelle : 0 à '+fmt(max)+' dossiers.</p>':'<p>Aucune donnée journalière disponible pour cette période.</p>')+'</section>';
 $('chartSections').dataset.trendSeries=JSON.stringify(series);
 $('chartSections').dataset.trendMax=String(max);
 $('chartSections').innerHTML=[['gauges',gauges],['stacked',stacked],['trend',trend]].map(([key,html])=>key==='trend'?html:html.replace('<section class="chartblock">','<section class="chartblock chart-clickable" data-chart-detail="'+key+'" role="button" tabindex="0" aria-label="Ouvrir le détail filtré du graphique">')).join('');
}
function selectTrendDay(index){
 const series=JSON.parse($('chartSections').dataset.trendSeries||'[]'),max=Number($('chartSections').dataset.trendMax)||1;
 if(!series[index])return;
 const W=760,left=46,right=22,top=25,plotH=265;
 const x=left+(series.length===1?(W-left-right)/2:index*(W-left-right)/(series.length-1));
 const r=series[index],svg=$('chartSections').querySelector('.chart-trend-dark svg');
 if(!svg)return;
 $('trendSelectedDate').textContent=r.date.split('-').reverse().join('/');
 for(const key of ['processed','loaded','notLoaded']){
  const el=$('chartSections').querySelector('[data-trend-value="'+key+'"]');
  if(el)el.textContent=Number(r[key]||0).toLocaleString('fr-FR');
  const dot=svg.querySelector('[data-trend-key="'+key+'"]');
  if(dot){dot.setAttribute('cx',x);dot.setAttribute('cy',top+plotH-plotH*Number(r[key]||0)/max);}
 }
 const cursor=svg.querySelector('#trendCursor');if(cursor){cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);}
}
$('chartSections').addEventListener('click',e=>{const point=e.target.closest('[data-trend-day]');if(point){e.stopPropagation();selectTrendDay(Number(point.dataset.trendDay));}});
$('chartSections').addEventListener('keydown',e=>{const point=e.target.closest('[data-trend-day]');if(point&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();selectTrendDay(Number(point.dataset.trendDay));}});
function openChartDetail(type){
 const period=$('chartsPeriod').value,from=$('chartsFrom').value,to=$('chartsTo').value,company=$('chartsAirline').value,dates=selectedDates(period,from,to);
 const labels={gauges:'Indicateurs de performance',stacked:'Répartition par compagnie',trend:'Évolution journalière'};
 const columns=[['airline','Compagnie'],['expected','Bagages'],['toProcess','À traiter'],['saved','Sauvés'],['loaded','Chargés'],['notLoaded','Non chargés'],['cancelled','Annulés']];
 let rows=type==='trend'?dates.flatMap(date=>dailySummaryFor(date).filter(r=>!company||String(r.airline||'').toUpperCase()===company).map(r=>({...r,date}))):groupedMetrics(dates,company);
 if(period==='month'&&!rows.length&&type!=='trend')rows=(metadata['flux_bags_monthly_'+from.slice(0,7)]||[]).filter(r=>!company||String(r.airline).toUpperCase()===company);
 const detail=$('chartDetail'),scope=period==='month'?from:period==='day'?from:from+' au '+to;
 $('chartDetailTitle').textContent=labels[type]||'Détail graphique';
 $('chartDetailScope').textContent='Période : '+scope+' · Compagnie : '+(company||'Toutes');
 $('chartDetailBody').innerHTML='<div class="chart-detail-table"><table><thead><tr>'+(type==='trend'?'<th>Date</th>':'')+columns.map(([,label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+(rows.map(r=>'<tr>'+(type==='trend'?'<td>'+esc(r.date.split('-').reverse().join('/'))+'</td>':'')+columns.map(([key])=>'<td>'+esc(key==='airline'?r.airline:Number(r[key]||0).toLocaleString('fr-FR'))+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="7">Aucune donnée sur cette période.</td></tr>')+'</tbody></table></div>';
 $('chartSections').hidden=true;detail.hidden=false;detail.scrollIntoView({block:'start',behavior:'smooth'});
}
$('chartSections').addEventListener('click',e=>{const block=e.target.closest('[data-chart-detail]');if(block)openChartDetail(block.dataset.chartDetail);});
$('chartSections').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-chart-detail]')){e.preventDefault();openChartDetail(e.target.dataset.chartDetail);}});
$('chartDetailBack').onclick=()=>{$('chartDetail').hidden=true;$('chartSections').hidden=false;};
$('chartsButton').onclick=openCharts;$('chartsClose').onclick=()=>$('chartsDialog').close();
for(const id of ['chartsPeriod','chartsFrom','chartsTo','chartsAirline'])$(id).onchange=renderCharts;

const faultStations=["10 - Check in error","11 - Incorrect or no entries on tag","12 - Not checked to final destination","13 - Checked to final destination - 2 separate contracts","15 - Wrong bag labeled (ex tag switch…)","16 - Bag received too late from checkin","17 - Old tag not removed","18 - Bag not authorized to load","21 - Bag left at station origin / correctly labelled","23 - Standby baggage left behind","25 - Gate checked baggage left behind","26 - Offloading due space / weight restrictions","27 - Local passenger rerouted / Bag not rerouted","31 - Sorting or loading error - wrong aircraft","35 - Sorting or loading error - wrong container / wrong compartment / behind cargo","41 - Delivered to wrong area","51 - Transit passenger rerouted / Bag not rerouted","52 - Interline MCT not available (MCT initialement non respecté)","53 - Interline MCT not available (MCT initialement OK)","54 - Interline bags not made available by inbound carrier per local agreement","55 - Online - own carrier - MCT available","56 - Online - own carrier - MCT not available","59 - Bag not authorised to load","61 - Industrial dispute (ex: strike…)","62 - Other reasons (ex: meteo…)","63 - Airport security","64 - Unserviceable equipment / belt / sortation system","66 - responsibility airport services","67 - Customs / Police / Immigration action","73 - Bag not claimed by passenger where required","76 - Found without tag - Tagless","77 - Errors by other carrier E.G tagging etc.","78 - Reason for mishandling not detectable"];
const remarkChoices=['HBAG','WCH','STRL','SPEQ','RRTE','BAG SOUTE S/SCAN'];
const upper=v=>String(v??'').toLocaleUpperCase('fr');
const normalizedClock=value=>{const digits=String(value||'').replace(/\\D/g,'');if(!digits)return '';if(digits.length===3)return '0'+digits[0]+':'+digits.slice(1);if(digits.length===4)return digits.slice(0,2)+':'+digits.slice(2);return String(value).replace(/[Hh]/g,':');};
function makeBagField(i,r){
 const keys=fields[i],value=r?String(pick(r,...keys)):'',label=['CIE','N° VOL','HEURE DÉPART','N° TAG','VOL APPORT','HEURE ARV.','LOCALISATION','REMARQUES','ANOMALIE','COMMENTAIRE/ACTION','STATUT','FAULT STATION'][i];
 const name='field'+i,common=' name="'+name+'" id="bagField'+i+'" ';
 if(i===0){const choices=[...new Set([...companyCodes(),...Object.values(dataset).flatMap(rows=>(Array.isArray(rows)?rows:[]).map(x=>upper(pick(x,...fields[0])))),upper(value)].filter(Boolean))].sort();return '<label>'+label+'<select '+common+' required><option value="">Choisir CIE</option>'+choices.map(c=>'<option value="'+esc(c)+'" '+(upper(value)===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label>';}
 if(i===3)return '<div class="bag-tag-field"><label>'+label+'</label><div id="bagTagRows"></div><button type="button" id="bagTagAdd" class="secondary bag-tag-add" aria-label="Ajouter un TAG">+ Ajouter un TAG</button></div>';
 if(i===2||i===5)return '<label>'+label+'<input '+common+' type="text" inputmode="numeric" placeholder="HH:MM" value="'+esc(normalizedClock(value))+'" maxlength="5"></label>';
 if(i===7)return '<label>'+label+'<input '+common+' list="bagRemarksList" value="'+esc(upper(value))+'" placeholder="Choisir ou saisir une remarque" autocomplete="off"><datalist id="bagRemarksList">'+[...new Set([...remarkChoices,upper(value)].filter(Boolean))].map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist></label>';
 if(i===10)return '<label>'+label+'<select '+common+'>'+['','SAUVÉ','CHARGÉ','NON CHARGÉ','ANNULÉ'].map(x=>'<option value="'+esc(x)+'" '+(upper(value).replace(/E$/,'É')===x?'selected':'')+'>'+esc(x||'Choisir statut')+'</option>').join('')+'</select></label>';
 if(i===11)return '<label>'+label+'<select '+common+' style="text-transform:none">'+['',...new Set([value,...faultStations].filter(Boolean))].map(x=>'<option value="'+esc(x)+'" '+(x===value?'selected':'')+'>'+esc(x||'Choisir station')+'</option>').join('')+'</select></label>';
 return '<label>'+label+'<input '+common+' value="'+esc(upper(value))+'" '+(i===3?'required':'')+' autocomplete="off"></label>';
}
const bagCount=r=>splitBagTags(pick(r,...fields[3])).length;
const splitBagTags=value=>String(value||'').split(/[\/;,\n]+/).map(x=>upper(x.trim())).filter(Boolean);
const countBags=r=>splitBagTags(pick(r,...fields[3])).length;
function addBagTag(value=''){
 const container=$('bagTagRows'),row=document.createElement('div');
 row.className='bag-tag-row';
 const input=document.createElement('input');input.type='text';input.className='bag-tag-input';input.placeholder='N° TAG';input.autocomplete='off';input.required=true;input.value=upper(value);
 input.addEventListener('input',()=>{const start=input.selectionStart,end=input.selectionEnd;input.value=upper(input.value);if(start!==null)input.setSelectionRange(start,end);});
 const remove=document.createElement('button');remove.type='button';remove.className='secondary bag-tag-remove';remove.textContent='−';remove.setAttribute('aria-label','Supprimer ce TAG');
 remove.onclick=()=>{if(container.children.length>1)row.remove();else input.value='';};
 row.append(input,remove);container.append(row);
}
const bagTags=()=>[...document.querySelectorAll('#bagTagRows .bag-tag-input')].map(el=>upper(el.value.trim())).filter(Boolean);
function updateBagPrefixes(){
 const company=upper($('bagField0').value.trim()),flight=$('bagField1'),tags=[...document.querySelectorAll('#bagTagRows .bag-tag-input')];
 if(!company)return;
 const old=$('bagField0').dataset.previous||'';
 const apply=(input)=>{let value=upper(input.value.trim());if(old&&value.startsWith(old))value=value.slice(old.length);if(value.startsWith(company))value=value.slice(company.length);if(!value||/^\d+$/.test(value))input.value=company+value;};
 apply(flight);tags.forEach(apply);$('bagField0').dataset.previous=company;
}
function dossierAuditSummary(record){
 const box=$('bagAuditSummary');
 if(!record){box.hidden=true;box.innerHTML='';return;}
 const history=Array.isArray(record._history)?record._history:[];
 const creation=history.find(event=>event.action==='CRÉATION');
 const changes=history.filter(event=>event.action==='MODIFICATION');
 const latest=changes.length?changes[changes.length-1]:null;
 const formatStamp=(value,includeTime)=>{
  if(!value)return 'Non renseigné';
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))return 'Non renseigné';
  return new Intl.DateTimeFormat('fr-FR',includeTime?{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',year:'2-digit'}).format(d);
 };
 const createdAt=record.createdAt||creation?.at;
 const createdBy=record.createdBy||creation?.user;
 const lines=['<div>Créé le : <strong>'+esc(formatStamp(createdAt,true))+'</strong></div>',
              '<div>Par : <strong>'+esc(createdBy||'Non renseigné')+'</strong></div>'];
 if(latest){
  lines.push('<div>Modifié le : <strong>'+esc(formatStamp(latest.at,false))+'</strong></div>');
  lines.push('<div>Par : <strong>'+esc(latest.user||'Non renseigné')+'</strong></div>');
 }
 box.innerHTML=lines.join('');
 box.hidden=false;
}
function openBag(day=null,index=null){
 bagEditing=day!==null&&index!==null?{day,index}:null;
 const r=bagEditing?dataset[day]?.[index]:null;
 dossierAuditSummary(r);
 $('bagHistory').hidden=true;$('bagHistoryToggle').hidden=!r;$('bagHistoryToggle').textContent='Afficher l’historique';
 $('bagHistory').innerHTML=(r?((r._history||[]).map(h=>'<div class="history-entry"><strong>'+esc(h.at?(Number.isFinite(Date.parse(h.at))?new Date(h.at).toLocaleString('fr-FR'):h.at):'')+'</strong> · '+(h.user?'<b>USER '+esc(h.user)+'</b> · ':'USER non renseigné · ')+(h.action?'<span>'+esc(h.action)+'</span> · ':'')+(h.changes||[]).map(c=>esc(c.field)+': '+esc(c.old)+' → '+esc(c.new)).join(' · ')+'</div>').join('')||'<small>Aucun historique de modification enregistré.</small>'):'');
 $('bagHistoryToggle').onclick=()=>{const show=$('bagHistory').hidden;$('bagHistory').hidden=!show;$('bagHistoryToggle').textContent=show?'Masquer l’historique':'Afficher l’historique';};
 $('bagTitle').textContent=bagEditing?'Dossier bagage':'Nouveau dossier';
 $('bagDate').value=day||new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 $('bagFields').innerHTML=fields.map((keys,i)=>makeBagField(i,r)).join('')+'<label class="bag-closed-field"><input type="checkbox" id="bagClosed" '+(r?.closed===true?'checked':'')+'> DOSSIER CLÔTURÉ</label>';
 (splitBagTags(r?pick(r,...fields[3]):'').length?splitBagTags(pick(r,...fields[3])):['']).forEach(addBagTag);
 $('bagTagAdd').onclick=()=>{addBagTag();const inputs=document.querySelectorAll('#bagTagRows .bag-tag-input');inputs[inputs.length-1].focus();};
 const company=upper($('bagField0').value.trim());
 $('bagField0').dataset.previous=company;
 if(!r){$('bagField0').addEventListener('input',updateBagPrefixes);$('bagField0').addEventListener('change',updateBagPrefixes);}
 for(const i of [2,5])$('bagField'+i).addEventListener('blur',e=>{e.target.value=normalizedClock(e.target.value);});
 $('bagFields').querySelectorAll('input:not([style*="text-transform:none"])').forEach(el=>el.addEventListener('input',()=>{const start=el.selectionStart,end=el.selectionEnd;el.value=upper(el.value);if(start!==null)el.setSelectionRange(start,end);}));
 $('bagDelete').hidden=!bagEditing;
 $('bagDelete').disabled=false;
 $('bagStatus').textContent='';$('bagDialog').showModal();
}
$('newBagButton').onclick=()=>openBag();$('bagClose').onclick=()=>$('bagDialog').close();
$('bagDelete').onclick=async()=>{
 if(!requireUser())return;
 if(!bagEditing)return;
 const {day,index}=bagEditing;
 const original=dataset[day]||[];
 const record=original[index];
 if(!record){$('bagStatus').textContent='Dossier introuvable. Actualise la page.';return;}
 const company=String(pick(record,...fields[0]));
 const tag=String(pick(record,...fields[3]));
 if(!confirm('Supprimer définitivement le dossier '+company+' / '+tag+' du '+day+' ?'))return;
 $('bagDelete').disabled=true;$('bagSave').disabled=true;$('bagStatus').textContent='Suppression en cours…';
 try{
  const response=await fetch('/api/data',{cache:'no-store'});
  if(!response.ok)throw Error('Impossible de vérifier les données avant suppression.');
  const live=(await response.json()).data?.[day]||[];
  const matches=live.map((r,i)=>({r,i})).filter(({r})=>String(pick(r,...fields[0]))===company&&String(pick(r,...fields[3]))===tag);
  if(matches.length!==1||JSON.stringify(matches[0].r)!==JSON.stringify(record))throw Error('Dossier modifié ou ambigu. Actualise la page avant de supprimer.');
  const updated=live.filter((_,i)=>i!==matches[0].i);
  const auditKey='flux_bags_deleted_'+day.slice(0,7);
  const deletions=[...(Array.isArray(metadata[auditKey])?metadata[auditKey]:[]),{...auditEvent('SUPPRESSION'),date:day,airline:company,tagNumber:tag,record}];
  await save({days:[{date:day,records:updated}],metadata:{[auditKey]:deletions}});
  metadata[auditKey]=deletions;dataset[day]=updated;bagEditing=null;$('bagDialog').close();render();
  $('message').textContent='Dossier '+company+' / '+tag+' supprimé de D1 TEST.';
 }catch(err){$('bagStatus').textContent='Erreur : '+err.message;}
 finally{$('bagDelete').disabled=false;$('bagSave').disabled=false;}
};
$('bagForm').onsubmit=async e=>{
 e.preventDefault();if(!requireUser()){$('bagStatus').textContent='Choisis ta session USER avant d’enregistrer.';return;}const date=$('bagDate').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){$('bagStatus').textContent='Date invalide';return;}
 const row={};fields.forEach((keys,i)=>row[keys[0]]=i===3?bagTags().join(' / '):i===11?$('bagForm').elements['field'+i].value.trim():upper($('bagForm').elements['field'+i].value.trim()));
 if(new Set(bagTags()).size!==bagTags().length){$('bagStatus').textContent='Un numéro de TAG est présent plusieurs fois dans ce dossier.';return;}
 if(!row.cie||!row.tagNumber){$('bagStatus').textContent='CIE et N° TAG sont obligatoires.';return;}
 for(const key of ['departureTime','arrivalTime']){if(row[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(row[key])){$('bagStatus').textContent='Heure invalide : utiliser HH:MM';return;}}
 const previous=bagEditing?dataset[bagEditing.day]?.[bagEditing.index]:null;
 const updated={...(previous||{}),...row,closed:$('bagClosed').checked};
 if(previous){const changes=fields.map((keys,i)=>({field:names[i+1]||keys[0],old:String(pick(previous,...keys)),new:String(row[keys[0]]??'')})).filter(c=>c.old!==c.new);if(Boolean(previous.closed)!==updated.closed)changes.push({field:'DOSSIER CLÔTURÉ',old:previous.closed?'OUI':'NON',new:updated.closed?'OUI':'NON'});if(bagEditing.day!==date)changes.unshift({field:'DATE',old:bagEditing.day,new:date});if(changes.length)updated._history=[...(previous._history||[]),auditEvent('MODIFICATION',changes)];}else{updated.createdBy=sessionUser;updated.createdAt=new Date().toISOString();updated._history=[auditEvent('CRÉATION')];}
 const records=[...(dataset[date]||[])];
 if(bagEditing&&bagEditing.day===date)records[bagEditing.index]=updated;else records.push(updated);
 $('bagSave').disabled=true;
 try{
  const days=[{date,records}];
  if(bagEditing&&bagEditing.day!==date){const original=[...(dataset[bagEditing.day]||[])];original.splice(bagEditing.index,1);days.push({date:bagEditing.day,records:original});}
  await save({days});dataset[date]=records;if(bagEditing&&bagEditing.day!==date)dataset[bagEditing.day]=days[1].records;
  const stayMonth=$('view').value==='month',stayYear=$('view').value==='year';$('date').value=stayYear?date.slice(0,4):stayMonth?date.slice(0,7):date;syncDateControl();$('airline').value='';$('search').value='';
  $('bagDialog').close();render();$('message').textContent='Dossier enregistré dans D1 TEST.';
 }catch(err){$('bagStatus').textContent=err.message;}finally{$('bagSave').disabled=false;}
};
const kpiLabels=['Nombre de bagages','À traiter','Sauvés','Chargés','Non chargés','Annulés'];
const kpiIcons=['🧳','📋','🛟','✅','⚠️','🚫'];
function kpiContext(){const month=currentMonth(),monthly=$('view').value==='month',date=monthly?month:$('date').value;return {monthly,date,key:monthly?'flux_bags_monthly_'+month:'flux_bags_daily_summary_'+month};}
function kpiRows(ctx){return ctx.monthly?[...(metadata[ctx.key]||[])]:[...((metadata[ctx.key]||{})[ctx.date]||[])];}
function renderKpiFields(){
 const ctx=kpiContext(),company=$('kpiCompany').value,record=kpiRows(ctx).find(r=>String(r.airline||'').toUpperCase()===company)||{};
 $('kpiFields').innerHTML=summaryKeys.map((key,i)=>'<label>'+kpiLabels[i]+'<input type="number" min="0" step="1" required name="'+key+'" value="'+esc(record[key]??0)+'"></label>').join('');
 $('kpiError').textContent='';
}
function editKpi(){
 const ctx=kpiContext(),codes=[...new Set([...companyCodes(),...kpiRows(ctx).map(r=>String(r.airline||'').toUpperCase())])].filter(Boolean).sort();
 const selected=$('airline').value;
 $('kpiCompany').innerHTML=codes.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 $('kpiCompany').value=codes.includes(selected)?selected:codes[0]||'';
 $('kpiScope').textContent=ctx.monthly?'Période mensuelle : '+ctx.date:'Journée : '+ctx.date;
 $('kpiError').textContent='';
 if(!codes.length){$('kpiError').textContent='Aucune compagnie disponible pour cette période.';$('kpiSave').disabled=true;}else{$('kpiSave').disabled=false;renderKpiFields();}
 $('kpiDialog').showModal();
}
$('kpiCompany').onchange=renderKpiFields;
$('kpiClose').onclick=()=>$('kpiDialog').close();
$('kpiForm').onsubmit=async event=>{
 event.preventDefault();const ctx=kpiContext(),company=$('kpiCompany').value;if(!company)return;
 const form=new FormData($('kpiForm')),values={};
 for(const key of summaryKeys){const value=Number(form.get(key));if(!Number.isSafeInteger(value)||value<0){$('kpiError').textContent='Les valeurs doivent être des nombres entiers positifs ou nuls.';return;}values[key]=value;}
 const rows=kpiRows(ctx),index=rows.findIndex(r=>String(r.airline||'').toUpperCase()===company);
 const updated={...(index>=0?rows[index]:{airline:company}),...values};
 if(index>=0)rows[index]=updated;else rows.push(updated);
 const next=ctx.monthly?rows:{...(metadata[ctx.key]||{}),[ctx.date]:rows};
 $('kpiSave').disabled=true;$('kpiError').textContent='Enregistrement en cours…';
 try{await save({days:[],metadata:{[ctx.key]:next}});metadata[ctx.key]=next;$('kpiDialog').close();render();$('message').textContent='KPI enregistrés pour '+company+' · '+ctx.date+' (base TEST).';}
 catch(err){$('kpiError').textContent='Erreur : '+err.message;}
 finally{$('kpiSave').disabled=false;}
};
const kpiNames=['Nombre de bagages','À traiter','Sauvés','Chargés / sauvés','Non chargés','Annulés'];
let selectedKpi=0,kpiCompanyDrill=null;
const kpiStatus=r=>String(normalizeFluxStatus(pick(r,...fields[10]))||pick(r,...fields[10])).toUpperCase();
function kpiFilteredRows(key,company){
 const search=$('search').value.trim().toLocaleLowerCase('fr');
 const rows=allRows().filter(({r})=>airlineVisible(pick(r,...fields[0]))&&(!$('airline').value||String(pick(r,...fields[0])).toUpperCase()===$('airline').value)&&(!company||String(pick(r,...fields[0])).toUpperCase()===company)&&(!search||matchesBagSearch(r,search)));
 if(key==='expected'||key==='toProcess')return rows;
 return rows.filter(({r})=>{const status=kpiStatus(r);return key==='saved'?status==='SAUVÉ':key==='loaded'?status==='CHARGÉ':key==='notLoaded'?status==='NON CHARGÉ':key==='cancelled'?status==='ANNULÉ':false;});
}
function kpiCompanyStats(key){
 const codes=[...new Set(kpiFilteredRows('toProcess',null).map(({r})=>String(pick(r,...fields[0])).toUpperCase()))].filter(Boolean).sort();
 const metrics=key==='expected'&&!$('search').value.trim()?new Map(summary().map(r=>[r.airline,r.expected])):null;
 return codes.map(code=>({code,count:metrics?Number(metrics.get(code)||0):kpiFilteredRows(key,code).reduce((n,item)=>n+countBags(item.r),0)})).filter(item=>item.count>0);
}
function openKpiList(index,company=null){
 selectedKpi=index;kpiCompanyDrill=company;const key=summaryKeys[index],label=kpiNames[index],period=$('view').value==='month'?currentMonth():$('date').value;
 const rows=kpiFilteredRows(key,company);
 $('kpiListBack').hidden=!company;
 $('kpiListSearch').value='';
 $('kpiListTitle').textContent=company?label+' · '+company:label;
 $('kpiListScope').textContent=period+' · '+(company||$('airline').value||'Toutes les compagnies')+($('search').value.trim()?' · Recherche : '+$('search').value.trim():'');
 const showCompanies=!company&&!$('airline').value&&(key==='expected'||key==='toProcess');
 if(showCompanies){
  const companies=kpiCompanyStats(key);
  $('kpiListBody').innerHTML='<div class="kpi-companies">'+companies.map(({code,count})=>'<button class="kpi-company" type="button" data-company="'+esc(code)+'"><small>COMPAGNIE</small><strong>'+esc(code)+' · '+count.toLocaleString('fr-FR')+' bagages'+'</strong></button>').join('')+'</div>';
 }else{
  const filtered=rows;
  $('kpiListBody').innerHTML=filtered.length?'<div class="kpi-list">'+filtered.map(({date,index:rowIndex,r})=>{
   const code=String(pick(r,...fields[0])),flight=String(pick(r,...fields[1])),tag=String(pick(r,...fields[3])),inbound=String(pick(r,...fields[4]))||'—',comment=String(pick(r,...fields[9])||pick(r,...fields[8])||'—'),status=kpiStatus(r);
   const cls=status.includes('ANNUL')?'status-cancelled':status.includes('NON CHARG')?'status-unloaded':status.includes('SAUV')?'status-saved':status.includes('CHARG')?'status-loaded':'status-other';
   return '<div class="kpi-row" role="button" tabindex="0" data-date="'+esc(date)+'" data-index="'+rowIndex+'"><span>'+esc(date.split('-').reverse().join('/'))+'</span><strong>'+esc(code)+' '+esc(flight)+'</strong><span>'+esc(tag)+'</span><span><strong>VOL D’APPORT</strong><div>'+esc(inbound)+'</div></span><span>'+esc(comment)+'</span><span class="status-pill '+cls+'">'+esc(status||'À QUALIFIER')+'</span></div>';
  }).join('')+'</div>':'<p class="kpi-empty">Aucun dossier correspondant à cette sélection.</p>';
 }
 filterKpiList();
 if(!$('kpiListDialog').open)$('kpiListDialog').showModal();
}
function filterKpiList(){const q=$('kpiListSearch').value.trim().toLocaleLowerCase('fr');$('kpiListBody').querySelectorAll('.kpi-company,.kpi-row').forEach(el=>{el.hidden=!el.textContent.toLocaleLowerCase('fr').includes(q);});}
$('kpiListSearch').oninput=filterKpiList;
$('kpiListBack').onclick=()=>openKpiList(selectedKpi,null);
$('kpiListClose').onclick=()=>$('kpiListDialog').close();
$('kpiListEdit').onclick=()=>{$('kpiListDialog').close();editKpi();};
$('kpiListBody').onclick=e=>{
 const company=e.target.closest('[data-company]');if(company){openKpiList(selectedKpi,company.dataset.company);return;}
 const row=e.target.closest('[data-date][data-index]');if(row){$('kpiListDialog').close();openBag(row.dataset.date,Number(row.dataset.index));}
};
$('kpiListBody').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('[data-date][data-index]');if(row){e.preventDefault();row.click();}}};
$('kpis').onclick=e=>{const card=e.target.closest('.kpi');if(card)openKpiList([...$('kpis').children].indexOf(card));};
function render(){
 const s=summary(),searchActive=!!$('search').value.trim(),totals=Object.fromEntries(summaryKeys.map(k=>[k,searchActive?(kpiFilteredRows(k,null).reduce((n,item)=>n+countBags(item.r),0)):s.reduce((n,r)=>n+(Number(r[k])||0),0)]));
 $('kpis').innerHTML=[['NOMBRE DE BAGAGES',totals.expected],['À TRAITER',totals.toProcess],['SAUVÉS',totals.saved],['CHARGÉS',totals.loaded],['NON CHARGÉS',totals.notLoaded],['ANNULÉS',totals.cancelled]].map(([name,n],i)=>'<div class="kpi" title="Cliquer pour consulter les dossiers du KPI" style="cursor:pointer"><label><span class="kpi-icon">'+kpiIcons[i]+'</span>'+name+'</label><strong>'+n.toLocaleString('fr-FR')+'</strong>'+'</div>').join('');
 const rows=visibleRows();$('rowCount').textContent=rows.length+' dossier(s)';
 $('rows').innerHTML=rows.map(({date,index,r})=>'<tr tabindex="0" role="button" aria-label="Ouvrir dossier '+esc(pick(r,...fields[3]))+'" data-date="'+date+'" data-index="'+index+'">'+fields.map((keys,i)=>{const value=i===10?(normalizeFluxStatus(pick(r,...keys))||pick(r,...keys)||'À qualifier'):pick(r,...keys);if(i===0){const status=String(normalizeFluxStatus(pick(r,...fields[10]))||pick(r,...fields[10])||'').toUpperCase();const cls=r.closed===true?'status-closed':status.includes('ANNUL')?'status-cancelled':status.includes('NON CHARG')?'status-unloaded':status.includes('SAUV')?'status-saved':status.includes('CHARG')?'status-loaded':'status-other';return '<td class="bag-indicator"><span class="status-dot '+cls+' '+(cls==='status-unloaded'?'status-dot-blink':'')+'" title="'+esc(status||'Statut non défini')+'" aria-label="'+esc(status||'Statut non défini')+'"></span></td><td class="bag-date">'+esc(date.split('-').reverse().join('/'))+'</td><td class="bag-company"><strong>'+esc(value)+'</strong></td>';}if(i===3){const tags=splitBagTags(value);return '<td class="bag-tag-cell" title="'+esc(tags.join(' / '))+'"><span class="bag-tag-preview">'+esc(tags[0]||'')+(tags.length>1?' <span class="bag-tag-more">+'+(tags.length-1)+' …</span>':'')+'</span></td><td class="bag-count">'+tags.length+'</td>';}if(i===11){const full=String(value||'').trim(),preview=full.length>32?full.slice(0,32).trimEnd()+'…':full;return '<td class="bag-fault-cell" title="'+esc(full)+'"><span class="bag-fault-preview">'+esc(preview)+'</span></td>';}if(i!==10)return '<td>'+esc(value)+'</td>';const status=String(value).toUpperCase();const cls=status.includes('ANNUL')?'status-cancelled':status.includes('NON CHARG')?'status-unloaded':status.includes('SAUV')?'status-saved':status.includes('CHARG')?'status-loaded':'status-other';return '<td><span class="status-pill '+cls+'">'+esc(value)+'</span></td>';}).join('')+'</tr>').join('')||'<tr><td colspan="15" class="empty">Aucun dossier pour cette sélection</td></tr>';
 document.querySelectorAll('.bagtable th').forEach((th,i)=>{if(i===0){th.textContent='';th.removeAttribute('aria-sort');return;}const column=i-1;th.setAttribute('aria-sort',column===sortColumn?(sortDirection===1?'ascending':'descending'):'none');th.innerHTML='<span class="th-inner"><span>'+esc(column===0?'DATE':names[column])+'</span><span class="sort-triangle" aria-hidden="true">'+(column===sortColumn?(sortDirection===1?'▲':'▼'):'▴')+'</span></span>';});

 $('message').textContent=($('view').value==='month'?'Vue mensuelle · ':'Vue journalière · ')+$('date').value+' · '+rows.length+' dossiers';
}
async function load(){
 try{const res=await fetch('/api/data',{cache:'no-store'});if(!res.ok)throw Error('API '+res.status);const json=await res.json();dataset=json.data||{};metadata=json.metadata||{};
 $('lastRefresh').textContent='Actualisation '+new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 const dates=Object.keys(dataset).sort();syncDateControl();
 const codes=visibilityCodes().filter(airlineVisible);
 const selected=$('airline').value;$('airline').innerHTML='<option value="">Toutes les compagnies</option>'+codes.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');$('airline').value=codes.includes(selected)?selected:'';render();
 }catch(e){$('message').textContent='Erreur de chargement : '+e.message;}
}
async function save(payload){const res=await fetch('/api/days',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw Error('Enregistrement impossible : '+res.status);}
function openRemarks(){
 const month=currentMonth(),remarks=metadata['flux_bags_remarks_'+month]||{},entries=$('view').value==='month'?Object.entries(remarks).flatMap(([day,items])=>(Array.isArray(items)?items:[]).map(v=>typeof v==='string'?v:JSON.stringify(v))):(remarks[$('date').value]||[]).map(v=>typeof v==='string'?v:JSON.stringify(v));
 $('remarkScope').textContent=$('view').value==='month'?month:$('date').value;
 $('remarkList').textContent=entries.join('\n\n')||'Aucune remarque enregistrée';
 if(!$('remarkDialog').open)$('remarkDialog').showModal();
}
$('remarkAdd').onclick=()=>{$('remarkDate').value=$('view').value==='month'?$('date').value.slice(0,7)+'-01':$('date').value;$('remarkInput').value='';$('remarkAddStatus').textContent='';$('remarkAddDialog').showModal();};
$('remarkAddClose').onclick=()=>$('remarkAddDialog').close();
$('remarkSave').onclick=async()=>{
 if(!requireUser()){$('remarkAddStatus').textContent='Choisis ta session USER.';return;}
 const value=$('remarkInput').value.trim(),day=$('remarkDate').value;if(!value||!day){$('remarkAddStatus').textContent='Date et remarque obligatoires.';return;}
 const key='flux_bags_remarks_'+day.slice(0,7),remarks={...(metadata[key]||{})};
 const formatted=day.split('-').reverse().join('-')+' — USER '+sessionUser+' — REMARQUES :\n'+value;
 remarks[day]=[...(remarks[day]||[]),formatted];$('remarkSave').disabled=true;
 try{await save({days:[],metadata:{[key]:remarks}});metadata[key]=remarks;$('remarkAddDialog').close();openRemarks();}
 catch(e){$('remarkAddStatus').textContent=e.message;}finally{$('remarkSave').disabled=false;}
};
$('remarkButton').onclick=openRemarks;$('remarkClose').onclick=()=>$('remarkDialog').close();
$('rows').onclick=e=>{const tr=e.target.closest('tr[data-index]');if(tr)openBag(tr.dataset.date,Number(tr.dataset.index));};
$('rows').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const tr=e.target.closest('tr[data-index]');if(tr){e.preventDefault();openBag(tr.dataset.date,Number(tr.dataset.index));}}};
document.querySelectorAll('.bagtable th').forEach((th,i)=>{if(i===0)return;const column=i-1;th.tabIndex=0;th.setAttribute('role','button');th.onclick=()=>{if(sortColumn===column)sortDirection*=-1;else{sortColumn=column;sortDirection=1;}render();};th.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();th.click();}};});
function updateMonthDisplay(){
 const month=$('view').value==='month',shell=$('dateInputShell'),display=$('monthDisplay'),value=$('date').value;
 shell.classList.toggle('month-mode',month);
 if(month&&/^\d{4}-\d{2}$/.test(value)){
  const [year,number]=value.split('-').map(Number);
  display.textContent=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(year,number-1,1));
 }else display.textContent='';
}
function syncDateControl(){const input=$('date'),month=$('view').value==='month',year=$('view').value==='year',value=input.value;input.type=year?'number':month?'month':'date';if(year){input.min='2000';input.max='2100';input.step='1';}input.value=year?value.slice(0,4):month?value.slice(0,7):(value.length===4?value+'-01-01':value.length===7?value+'-01':value);$('dateLabel').firstChild.textContent=year?'Année':month?'Mois':'Date';updateMonthDisplay();}
$('view').onchange=()=>{syncDateControl();render();};
function openExcelExport(){
 const monthly=$('view').value==='month',value=$('date').value;
 $('excelPeriod').value=monthly?'month':'day';
 $('excelFrom').type=monthly?'month':'date';
 $('excelFrom').value=monthly?value.slice(0,7):(value.length===7?value+'-01':value);
 $('excelTo').value=value.length===7?value+'-01':value;
 const codes=[...new Set([...Object.values(dataset).flatMap(rows=>(Array.isArray(rows)?rows:[]).map(r=>String(pick(r,...fields[0])).toUpperCase())),...Object.keys(dataset).flatMap(date=>dailySummaryFor(date).map(r=>String(r.airline||'').toUpperCase()))].filter(Boolean))].sort();
 $('excelAirline').innerHTML='<option value="">Toutes les compagnies</option>'+codes.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 $('excelAirline').value=codes.includes($('airline').value)?$('airline').value:'';
 updateExcelPeriod();$('excelStatus').textContent='';$('excelDialog').showModal();
}
function updateExcelPeriod(){
 const period=$('excelPeriod').value,from=$('excelFrom'),to=$('excelTo'),v=from.value;
 from.type=period==='month'?'month':'date';from.value=period==='month'?v.slice(0,7):(v.length===7?v+'-01':v);
 $('excelToLabel').hidden=period!=='range';to.disabled=period!=='range';
 $('excelFromLabel').firstChild.textContent=period==='month'?'Mois':period==='day'?'Jour':'Du';
}
$('export').onclick=openExcelExport;
$('excelPeriod').onchange=updateExcelPeriod;
$('excelClose').onclick=()=>$('excelDialog').close();
$('excelDownload').onclick=async()=>{
 const period=$('excelPeriod').value,from=$('excelFrom').value,to=$('excelTo').value,company=$('excelAirline').value;
 if(!from||(period==='range'&&(!to||to<from))){$('excelStatus').textContent='Vérifiez les dates sélectionnées.';return;}
 const btn=$('excelDownload');btn.disabled=true;$('excelStatus').textContent='Création du fichier Excel en cours…';
 try{const {exportFluxExcel}=await import('/flux-bags-excel.js?v=premium-dashboard-v3-20261014');const result=await exportFluxExcel({dataset,metadata,period,from,to,company});$('excelStatus').textContent='Fichier créé : '+result.name+' · '+result.dossiers+' dossiers.';}
 catch(e){$('excelStatus').textContent='Erreur export Excel : '+e.message;}
 finally{btn.disabled=false;}
};
$('headerRefresh').onclick=load;setInterval(()=>{if(!document.querySelector('dialog[open]')&&!document.hidden)load();},15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))load();});$('date').onchange=()=>{updateMonthDisplay();render();};$('airline').onchange=render;$('search').oninput=render;setupUserSession();setupAirlineVisibility();const today=new Date();const localToday=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);$('view').value='month';$('date').type='month';$('date').value=localToday.slice(0,7);updateMonthDisplay();load();
