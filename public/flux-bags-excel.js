/* Export Excel FLUX BAGAGES — test only. Requires ExcelJS browser bundle. */
const fields=[['cie','compagnie','airline','company'],['flightNumber','vol','numeroVol','flight'],['departureTime','heureDepart','heure'],['tagNumber','tag','numeroTag'],['inboundFlight','volApport'],['arrivalTime','heureArrivee'],['location','localisation'],['remarks','remarques'],['anomaly','anomalie'],['commentAction','commentaireAction','action','commentaire'],['fluxStatus','status'],['faultStation','fault_station']];
const names=['DATE','CIE','N° VOL','HEURE DÉPART','N° TAG','NOMBRE BAGAGES','VOL APPORT','HEURE ARRIVÉE','LOCALISATION','REMARQUES','ANOMALIE','COMMENTAIRE/ACTION','STATUT','FAULT STATION'];
const tagList=v=>String(v||'').split(/[\/;,\n]+/).map(s=>s.trim()).filter(Boolean);
const keys=['expected','toProcess','saved','loaded','notLoaded'],labels=['ATTENDUS','À TRAITER','SAUVÉS','CHARGÉS','NON CHARGÉS'];
const pick=(r,ks)=>ks.map(k=>r?.[k]).find(v=>v!==undefined&&v!==null&&v!=='')??'';
const num=v=>Number(v)||0;
function download(buffer,name){const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function loadExcelJS(){if(window.ExcelJS)return Promise.resolve(window.ExcelJS);if(window.__fluxExcelPromise)return window.__fluxExcelPromise;window.__fluxExcelPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';script.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(Error('Bibliothèque Excel indisponible'));script.onerror=()=>reject(Error('Chargement Excel impossible : connexion CDN requise'));document.head.append(script);});return window.__fluxExcelPromise;}
const dark='163653',green='10B981',blue='3B82F6',red='EF4444';
function header(ws,row,columns){const r=ws.getRow(row);r.values=columns;r.font={bold:true,color:{argb:'FFFFFFFF'}};r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+dark}};r.height=26;r.alignment={vertical:'middle',wrapText:true};}
function setup(ws,widths){ws.views=[{state:'frozen',ySplit:4}];widths.forEach((w,i)=>ws.getColumn(i+1).width=w);ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};}
function title(ws,text,subtitle,count){ws.mergeCells(1,1,1,count);const c=ws.getCell(1,1);c.value=text;c.font={bold:true,size:18,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+dark}};ws.getRow(1).height=35;ws.mergeCells(2,1,2,count);ws.getCell(2,1).value=subtitle;ws.getCell(2,1).font={italic:true,color:{argb:'FF53657A'}};}
function paintRows(ws,start,end,count){for(let row=start;row<=end;row++){const r=ws.getRow(row);r.height=22;r.eachCell({includeEmpty:true},(cell,col)=>{if(col>count)return;cell.alignment={vertical:'middle',wrapText:true};if(row%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5FA'}};});}}
function pngChart(kind,rows){const c=document.createElement('canvas');c.width=1120;c.height=540;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.font='bold 30px system-ui';g.fillStyle='#163653';g.fillText(kind==='bar'?'Répartition par compagnie':kind==='line'?'Évolution journalière':'Indicateurs de performance',35,55);
 const palette=['#10b981','#3b82f6','#ef4444','#8b5cf6'];
 if(kind==='bar'){const top=90,barH=Math.min(28,370/Math.max(1,rows.length));rows.slice(0,14).forEach((r,i)=>{const y=top+i*(barH+9),values=[num(r.saved),num(r.loaded),num(r.notLoaded)],total=values.reduce((a,b)=>a+b,0);g.fillStyle='#163653';g.font='16px system-ui';g.fillText(String(r.airline||''),35,y+barH*.8);let x=110;values.forEach((v,j)=>{g.fillStyle=palette[j];const w=total?v/total*880:0;g.fillRect(x,y,w,barH);x+=w;});g.fillStyle='#53657a';g.fillText(String(total),1010,y+barH*.8);});}
 if(kind==='line'){const left=75,right=1060,top=105,bottom=450,max=Math.max(1,...rows.flatMap(r=>[num(r.toProcess),num(r.loaded),num(r.notLoaded),num(r.cancelled)]));g.strokeStyle='#e2e8f0';g.fillStyle='#64748b';g.font='16px system-ui';for(let i=0;i<=4;i++){let y=bottom-(bottom-top)*i/4;g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();g.fillText(String(Math.round(max*i/4)),25,y+5);}[['toProcess','#3b82f6'],['loaded','#10b981'],['notLoaded','#ef4444'],['cancelled','#8b5cf6']].forEach(([key,color])=>{g.strokeStyle=color;g.lineWidth=3;g.beginPath();rows.forEach((r,i)=>{const x=left+(rows.length===1?.5:i/(rows.length-1))*(right-left),y=bottom-num(r[key])/max*(bottom-top);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();});g.fillStyle='#64748b';g.fillText(rows[0]?.date||'',left,490);g.fillText(rows.at(-1)?.date||'',right-105,490);}
 if(kind==='kpi'){const total=rows.reduce((a,r)=>a+num(r.toProcess),0);[['Chargés','loaded','#3b82f6'],['Sauvés','saved','#10b981'],['Non chargés','notLoaded','#ef4444'],['Annulés','cancelled','#8b5cf6']].forEach(([label,key,color],i)=>{const x=150+i*275,y=260,v=rows.reduce((a,r)=>a+num(r[key]),0),pct=total?Math.min(1,v/total):0;g.lineWidth=25;g.strokeStyle='#e2e8f0';g.beginPath();g.arc(x,y,76,0,Math.PI*2);g.stroke();g.strokeStyle=color;g.beginPath();g.arc(x,y,76,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);g.stroke();g.fillStyle='#163653';g.textAlign='center';g.font='bold 32px system-ui';g.fillText(Math.round(pct*100)+'%',x,y+10);g.font='20px system-ui';g.fillText(label,x,380);g.font='16px system-ui';g.fillText(v+' / '+total,x,410);});g.textAlign='left';}
 return c.toDataURL('image/png').split(',')[1];}

const navy='102B49',navy2='173D62',muted='65788D',light='EFF5FA',orange='F97316',white='FFFFFF';
const fill=hex=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+hex}});
const font=(color=navy,size=11,bold=false)=>({name:'Aptos',size,bold,color:{argb:'FF'+color}});
const status=r=>String(pick(r,fields[10])).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function statusKey(r){const v=status(r);return v==='CHARGE'?'loaded':v==='NON CHARGE'?'notLoaded':v==='SAUVE'?'saved':v==='ANNULE'?'cancelled':'other';}
function fmtDate(s){if(!s)return '';const [y,m,d]=s.split('-');return d+'/'+m+'/'+y;}
function dateScope(period,from,to){return period==='day'?fmtDate(from):period==='month'?from.slice(0,7).split('-').reverse().join('/'):fmtDate(from)+' — '+fmtDate(to);}
function band(ws,row,a,b,label,color=navy){
 ws.mergeCells(row,a,row,b);const c=ws.getCell(row,a);c.value=label;c.fill=fill(color);c.font=font(white,12,true);c.alignment={vertical:'middle',indent:1};ws.getRow(row).height=28;
}
function hero(ws,title,scope,end){
 ws.mergeCells(1,1,2,end);const c=ws.getCell(1,1);c.value='ALYZIA  |  FLUX BAGAGES  —  '+title;c.font=font(white,20,true);c.fill=fill(navy);c.alignment={vertical:'middle',indent:1};ws.getRow(1).height=26;ws.getRow(2).height=26;
 ws.mergeCells(3,1,3,end);const sub=ws.getCell(3,1);sub.value='COMPTE RENDU DE SUPERVISION  •  '+scope+'  •  Source : PILOTAGE FLUX BAGAGE TEST';sub.font=font(muted,11);sub.alignment={vertical:'middle',indent:1};ws.getRow(3).height=26;
 ws.pageSetup={...ws.pageSetup,fitToPage:true,fitToWidth:1,fitToHeight:0};
}
function metric(ws,row,c1,c2,label,value,color=navy){
 ws.mergeCells(row,c1,row,c2);ws.mergeCells(row+1,c1,row+1,c2);
 const a=ws.getCell(row,c1),b=ws.getCell(row+1,c1);a.value=label;a.fill=fill(color);a.font=font(white,11,true);a.alignment={horizontal:'center',vertical:'middle'};
 b.value=value;b.fill=fill(light);b.font=font(color,23,true);b.alignment={horizontal:'center',vertical:'middle'};ws.getRow(row).height=25;ws.getRow(row+1).height=39;
}
function dataHeader(ws,row,labels){const rr=ws.getRow(row);rr.values=labels;rr.height=34;rr.eachCell(c=>{c.fill=fill(navy2);c.font=font(white,10,true);c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});}
function styleData(ws,first,last,cols,statusColumn){
 for(let i=first;i<=last;i++){const r=ws.getRow(i);
  // ExcelJS wrapText alone does not auto-fit row height in generated workbooks.
  // Estimate lines from each column's configured width and explicit line breaks.
  let lines=1;
  for(let j=1;j<=cols;j++){
   const value=String(r.getCell(j).value??'');
   const width=Math.max(6,Number(ws.getColumn(j).width)||16);
   const usable=Math.max(5,Math.floor(width*0.91));
   const count=value.split(/\r?\n/).reduce((n,part)=>n+Math.max(1,Math.ceil(part.length/usable)),0);
   lines=Math.max(lines,count);
  }
  r.height=Math.max(27,Math.min(360,lines*15+9));
  for(let j=1;j<=cols;j++){const c=r.getCell(j);c.font=font(navy,10);c.alignment={vertical:'middle',wrapText:true};if(i%2===0)c.fill=fill(light);}
 if(statusColumn){const c=r.getCell(statusColumn),v=status({fluxStatus:c.value});if(v==='CHARGE'){c.fill=fill('DCFCE7');c.font=font('166534',10,true);}else if(v==='NON CHARGE'){c.fill=fill('FFEDD5');c.font=font('9A3412',10,true);}else if(v==='SAUVE'){c.fill=fill('DCFCE7');c.font=font('166534',10,true);}else if(v==='ANNULE'){c.fill=fill('EDE9FE');c.font=font('6D28D9',10,true);}}
 }
}
function addChart(book,ws,kind,rows,row,col,width=850,height=385){
 if(!rows.length)return;
 const data=pngChart(kind,rows),id=book.addImage({base64:data,extension:'png'});
 ws.addImage(id,{tl:{col,row},ext:{width,height}});
}
async function legacyExportFluxExcel({dataset,metadata={},period,from,to,company}){
 const ExcelJS=await loadExcelJS(),book=new ExcelJS.Workbook();
 book.creator='ALYZIA CDG2 — PILOTAGE FLUX BAGAGE';book.created=new Date();
 const dates=[...new Set([...Object.keys(dataset),...Object.keys(window.__fluxExportMetadata||{}).filter(k=>/^flux_bags_expected_daily_\d{4}-\d{2}-\d{2}$/.test(k)).map(k=>k.replace('flux_bags_expected_daily_',''))])].filter(d=>period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):d>=from&&d<=to).sort();
 const selected=dates.flatMap(date=>(dataset[date]||[]).filter(r=>!company||String(pick(r,fields[0])).toUpperCase()===company).map(r=>({date,r})));
 const grouped=new Map(),daily=new Map(),anomalies=new Map(),locations=new Map();
 const blank=()=>({expected:0,toProcess:0,saved:0,loaded:0,notLoaded:0,cancelled:0,other:0,baggage:0});
 for(const date of dates){
  daily.set(date,{date,...blank()});
  for(const {r} of selected.filter(x=>x.date===date)){
   const cie=String(pick(r,fields[0])).toUpperCase()||'AUTRES';
   if(!grouped.has(cie))grouped.set(cie,{airline:cie,...blank()});
   for(const m of [grouped.get(cie),daily.get(date)]){m.toProcess++;m[statusKey(r)]++;m.baggage+=tagList(pick(r,fields[3])).length;}
   const anomaly=String(pick(r,fields[8])).trim();if(anomaly)anomalies.set(anomaly,(anomalies.get(anomaly)||0)+1);
   const loc=String(pick(r,fields[6])).trim();if(loc)locations.set(loc,(locations.get(loc)||0)+1);
  }
  const stored=(metadata['flux_bags_daily_summary_'+date.slice(0,7)]||{})[date]||[];
  for(const r of stored){const cie=String(r.airline||'').toUpperCase();if(!cie||(company&&company!==cie))continue;
   if(!grouped.has(cie))grouped.set(cie,{airline:cie,...blank()});
   grouped.get(cie).expected+=num(r.expected);daily.get(date).expected+=num(r.expected);
  }
 }
 const metrics=[...grouped.values()].sort((a,b)=>b.toProcess-a.toProcess||a.airline.localeCompare(b.airline));
 const dailyRows=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const total=selected.length,loaded=selected.filter(x=>statusKey(x.r)==='loaded').length,notLoaded=selected.filter(x=>statusKey(x.r)==='notLoaded').length,saved=selected.filter(x=>statusKey(x.r)==='saved').length,cancelled=selected.filter(x=>statusKey(x.r)==='cancelled').length,other=total-loaded-notLoaded-saved-cancelled;
 const scope=dateScope(period,from,to)+(company?'  •  '+company:'  •  Toutes compagnies');
 const recap=book.addWorksheet('RÉCAPITULATIF');setup(recap,Array(16).fill(12));recap.views=[{state:'frozen',ySplit:3}];hero(recap,'RÉCAPITULATIF',scope,16);
 metric(recap,5,1,4,'DOSSIERS TOTAL',total);metric(recap,5,5,8,'CHARGÉS  '+(total?(100*loaded/total).toFixed(1):'0')+' %',loaded,'168454');
 metric(recap,5,9,12,'NON CHARGÉS  '+(total?(100*notLoaded/total).toFixed(1):'0')+' %',notLoaded,'C2410C');
 metric(recap,5,13,16,'SAUVÉS / AUTRES',saved+other,'52667C');
 band(recap,9,1,8,'RÉPARTITION PAR COMPAGNIE  ·  TOP 10');band(recap,9,10,16,'SYNTHÈSE DES STATUTS');
 dataHeader(recap,10,['COMPAGNIE','DOSSIERS','CHARGÉS','NON CHARGÉS','SAUVÉS','AUTRES','ATTENDUS','PART %']);
 for(let i=0;i<Math.max(10,Math.min(metrics.length,10));i++){
  const r=metrics[i];if(!r)continue;
  const row=recap.getRow(11+i);[r.airline,r.toProcess,r.loaded,r.notLoaded,r.saved,r.other,r.expected,total?Number((r.toProcess/total*100).toFixed(1)):0].forEach((v,j)=>row.getCell(j+1).value=v);
  row.getCell(8).numFmt='0.0"%"';
 }
 styleData(recap,11,20,8);
 const summary=[['TOTAL',total],['CHARGÉS',loaded],['NON CHARGÉS',notLoaded],['SAUVÉS',saved],['ANNULÉS',cancelled],['AUTRES',other],['BAGAGES TRAITÉS',selected.reduce((n,x)=>n+tagList(pick(x.r,fields[3])).length,0)],['COMPAGNIES',metrics.filter(x=>x.toProcess).length],['JOURNÉES',dates.length]];
 summary.forEach(([label,value],i)=>{const row=recap.getRow(11+i);recap.mergeCells(11+i,10,11+i,13);const c=row.getCell(10);c.value=label;c.font=font(muted,11,true);row.getCell(14).value=value;row.getCell(14).font=font(navy,13,true);row.height=25;});
 band(recap,23,1,8,'ÉVOLUTION JOURNALIÈRE');band(recap,23,9,16,'RÉPARTITION DES STATUTS');
 addChart(book,recap,'line',dailyRows,24,0,635,300);
 addChart(book,recap,'kpi',metrics,24,8,635,300);
 band(recap,42,1,8,'TOP ANOMALIES');band(recap,42,9,16,'TOP LOCALISATIONS');
 [...anomalies].sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([label,n],i)=>{recap.mergeCells(43+i,1,43+i,6);recap.getCell(43+i,1).value=label;recap.getCell(43+i,7).value=n;});
 [...locations].sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([label,n],i)=>{recap.mergeCells(43+i,9,43+i,14);recap.getCell(43+i,9).value=label;recap.getCell(43+i,15).value=n;});
 recap.pageSetup={...recap.pageSetup,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:'A1:P52'};
 const dossier=book.addWorksheet('DOSSIERS');setup(dossier,[14,9,13,16,22,14,17,17,24,25,26,36,18,23]);hero(dossier,'DOSSIERS',scope,14);
 dataHeader(dossier,5,names);for(const {date,r} of selected)dossier.addRow([fmtDate(date),...fields.flatMap((k,i)=>i===3?[tagList(pick(r,k)).join('\n'),tagList(pick(r,k)).length]:[String(pick(r,k))])]);
 styleData(dossier,6,dossier.rowCount,14,13);dossier.views=[{state:'frozen',ySplit:5}];dossier.autoFilter={from:'A5',to:'N'+Math.max(6,dossier.rowCount)};
 for(const date of dates){
  const entries=selected.filter(x=>x.date===date);if(!entries.length)continue;
  const sheet=book.addWorksheet(date.slice(8,10)+'-'+date.slice(5,7));setup(sheet,[14,9,13,16,22,14,17,17,24,25,26,36,18,23]);
  hero(sheet,'JOUR PAR JOUR',fmtDate(date)+(company?'  •  '+company:''),14);
  const counts={loaded:0,notLoaded:0,saved:0,cancelled:0,other:0};for(const {r} of entries)counts[statusKey(r)]++;
  band(sheet,5,1,14,'DOSSIERS : '+entries.length+'     CHARGÉS : '+counts.loaded+'     NON CHARGÉS : '+counts.notLoaded+'     SAUVÉS : '+counts.saved+'     ANNULÉS : '+counts.cancelled+'     AUTRES : '+counts.other);
  dataHeader(sheet,7,names);for(const {r} of entries)sheet.addRow([fmtDate(date),...fields.flatMap((k,i)=>i===3?[tagList(pick(r,k)).join('\n'),tagList(pick(r,k)).length]:[String(pick(r,k))])]);
  styleData(sheet,8,sheet.rowCount,14,13);sheet.views=[{state:'frozen',ySplit:7}];sheet.autoFilter={from:'A7',to:'N'+Math.max(8,sheet.rowCount)};
 }
 const dateSummary=book.addWorksheet('SYNTHÈSE PAR DATE');
 setup(dateSummary,[17,18,18,18,18,18,18,19,19]);
 hero(dateSummary,'SYNTHÈSE PAR DATE',scope,9);
 dataHeader(dateSummary,5,['DATE','DOSSIERS','BAGAGES TRAITÉS','BAGAGES ATTENDUS','SAUVÉS','CHARGÉS','NON CHARGÉS','ANNULÉS','AUTRES']);
 for(const d of dailyRows)dateSummary.addRow([fmtDate(d.date),d.toProcess,d.baggage,d.expected,d.saved,d.loaded,d.notLoaded,d.cancelled,d.other]);
 styleData(dateSummary,6,dateSummary.rowCount,9);
 dateSummary.autoFilter={from:'A5',to:'I'+Math.max(6,dateSummary.rowCount)};
 const supervision=book.addWorksheet('SUPERVISION');setup(supervision,Array(14).fill(16));hero(supervision,'COMPTE RENDU DE SUPERVISION',scope,14);
 metric(supervision,5,1,3,'DOSSIERS',total);metric(supervision,5,4,6,'CHARGÉS',loaded,'168454');metric(supervision,5,7,9,'NON CHARGÉS',notLoaded,'C2410C');metric(supervision,5,10,12,'SAUVÉS / AUTRES',saved+other,'52667C');
 band(supervision,9,1,14,'1. SYNTHÈSE GÉNÉRALE');
 supervision.getCell('A10').value='Période : '+scope;supervision.getCell('A11').value='Taux de chargement : '+(total?(loaded/total*100).toFixed(1):'0')+' % des dossiers';
 supervision.getCell('A12').value='Journées sélectionnées : '+dates.length+'  |  Compagnies : '+metrics.length;
 band(supervision,14,1,14,'2. TOP COMPAGNIES');dataHeader(supervision,15,['COMPAGNIE','DOSSIERS','CHARGÉS','NON CHARGÉS','SAUVÉS']);
 metrics.slice(0,10).forEach(r=>supervision.addRow([r.airline,r.toProcess,r.loaded,r.notLoaded,r.saved]));styleData(supervision,16,supervision.rowCount,5);
 const base=Math.max(29,supervision.rowCount+3);band(supervision,base,1,14,'3. ANOMALIES SIGNALÉES');
 const sortedAnomalies=[...anomalies].sort((a,b)=>b[1]-a[1]).slice(0,12);if(!sortedAnomalies.length)supervision.getCell(base+1,1).value='Aucune anomalie renseignée dans les dossiers sélectionnés.';
 else sortedAnomalies.forEach(([label,n],i)=>{supervision.getCell(base+i+1,1).value=label;supervision.getCell(base+i+1,4).value=n;});
 const locRow=base+Math.max(3,sortedAnomalies.length+2);band(supervision,locRow,1,14,'4. RÉPARTITION PAR LOCALISATION');
 [...locations].sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([label,n],i)=>{supervision.getCell(locRow+i+1,1).value=label;supervision.getCell(locRow+i+1,4).value=n;});
 const obs=locRow+13;band(supervision,obs,1,14,'5. OBSERVATIONS / ACTIONS DE SUIVI');
 supervision.mergeCells(obs+1,1,obs+2,14);supervision.getCell(obs+1,1).value='Zone réservée à la saisie des observations de supervision. Aucune analyse opérationnelle non vérifiée n’est générée automatiquement.';
 supervision.getCell(obs+1,1).alignment={wrapText:true,vertical:'middle'};supervision.getCell(obs+1,1).font=font(muted,11);
 const graphs=book.addWorksheet('GRAPHIQUES');setup(graphs,Array(12).fill(16));hero(graphs,'GRAPHIQUES',scope,12);
 addChart(book,graphs,'kpi',metrics,5,0,1120,390);addChart(book,graphs,'line',dailyRows,27,0,860,390);addChart(book,graphs,'bar',metrics,49,0,860,390);
 const buffer=await book.xlsx.writeBuffer(),name='FLUX_BAGAGES_SUPERVISION_'+(period==='range'?from+'_au_'+to:period==='month'?from.slice(0,7):from)+'_'+(company||'TOUTES')+'.xlsx';
 download(buffer,name);return {name,dossiers:total,compagnies:metrics.length,jours:dates.length};
}


/* Official workbook template export. OOXML editing preserves charts, drawings and existing Excel styles. */
let __fluxZipPromise;
function fluxLoadZip(){
 if(window.JSZip)return Promise.resolve(window.JSZip);
 if(!__fluxZipPromise)__fluxZipPromise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('JSZip indisponible'));
  s.onerror=()=>reject(new Error('Chargement JSZip impossible'));
  document.head.append(s);
 });
 return __fluxZipPromise;
}
const fluxNS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
function fluxCell(doc,row,col,value){
 const ref=fluxColumnName(col)+row.getAttribute('r');
 let cell=Array.from(row.children).find(c=>c.localName==='c'&&c.getAttribute('r')===ref);
 if(!cell){cell=doc.createElementNS(fluxNS,'c');cell.setAttribute('r',ref);
  const next=Array.from(row.children).find(c=>c.localName==='c'&&fluxColumn(c.getAttribute('r'))>col);
  row.insertBefore(cell,next||null);
 }
 for(const child of Array.from(cell.children))if(['v','is','f'].includes(child.localName))cell.removeChild(child);
 if(value===null||value===undefined||value===''){cell.removeAttribute('t');return;}
 if(typeof value==='number'&&Number.isFinite(value)){cell.removeAttribute('t');const v=doc.createElementNS(fluxNS,'v');v.textContent=String(value);cell.appendChild(v);}
 else{cell.setAttribute('t','inlineStr');const is=doc.createElementNS(fluxNS,'is'),t=doc.createElementNS(fluxNS,'t');t.textContent=String(value);if(/^\s|\s$/.test(String(value)))t.setAttribute('xml:space','preserve');is.appendChild(t);cell.appendChild(is);}
}
function fluxColumnName(index){let n=index+1,s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function fluxColumn(ref){let n=0;for(const c of (ref||'').match(/^[A-Z]+/)?.[0]||'')n=n*26+c.charCodeAt(0)-64;return n-1;}
function fluxRow(doc,data,rowNo){
 let row=Array.from(data.children).find(r=>r.localName==='row'&&+r.getAttribute('r')===rowNo);
 if(!row){row=doc.createElementNS(fluxNS,'row');row.setAttribute('r',rowNo);const next=Array.from(data.children).find(r=>r.localName==='row'&&+r.getAttribute('r')>rowNo);data.insertBefore(row,next||null);}
 return row;
}
function fluxWriteCells(doc,rowNo,values){const data=doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],row=fluxRow(doc,data,rowNo);values.forEach((v,i)=>fluxCell(doc,row,i,v));}
function dateSerial(d){return Math.round((Date.parse(d+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);}
function fluxDate(s){if(!s)return '';const [y,m,d]=String(s).slice(0,10).split('-');return d+'/'+m+'/'+y;}
function fluxRows({dataset,period,from,to,company}){
 const dates=[...new Set([...Object.keys(dataset),...Object.keys(window.__fluxExportMetadata||{}).filter(k=>/^flux_bags_expected_daily_\d{4}-\d{2}-\d{2}$/.test(k)).map(k=>k.slice('flux_bags_expected_daily_'.length))])].filter(d=>period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):d>=from&&d<=to).sort();
 const entries=dates.flatMap(date=>(dataset[date]||[]).filter(r=>!company||String(pick(r,fields[0])).trim().toUpperCase()===company.toUpperCase()).map(r=>({date,r})));
 return {dates,entries};
}
export async function exportFluxExcel({dataset,metadata={},period,from,to,company}){
 window.__fluxExportMetadata=metadata;
 const {dates,entries}=fluxRows({dataset,period,from,to,company});
 if(entries.length>1735)throw new Error('Le modèle officiel contient 1 735 lignes de dossiers maximum. Export annulé pour éviter toute perte de données ('+entries.length+' dossiers).');
 const JSZip=await fluxLoadZip();
 const response=await fetch('/ALYZIA_FLUX_BAGAGES.xlsx?v=validated-20261023',{cache:'no-store'});
 if(!response.ok)throw new Error('Modèle officiel introuvable sur le serveur (HTTP '+response.status+')');
 const zip=await JSZip.loadAsync(await response.arrayBuffer());
 const parser=new DOMParser(),serializer=new XMLSerializer();
 const load=async file=>{const raw=await zip.file(file)?.async('string');if(!raw)throw new Error('Feuille du modèle manquante : '+file);const doc=parser.parseFromString(raw,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('XML invalide : '+file);return doc;};
 const styles=await load('xl/styles.xml');
 const numFmts=styles.getElementsByTagNameNS(fluxNS,'numFmts')[0]||styles.createElementNS(fluxNS,'numFmts');
 if(!numFmts.parentNode)styles.documentElement.insertBefore(numFmts,styles.documentElement.firstChild);
 const fmt=styles.createElementNS(fluxNS,'numFmt');fmt.setAttribute('numFmtId','180');fmt.setAttribute('formatCode','dd/mm/yyyy');numFmts.appendChild(fmt);numFmts.setAttribute('count',String(numFmts.children.length));
 const xfs=styles.getElementsByTagNameNS(fluxNS,'cellXfs')[0];if(!xfs)throw new Error('Styles Excel manquants');
 const dateStyleIndex=xfs.children.length;const xf=xfs.children[0].cloneNode(true);xf.setAttribute('numFmtId','180');xf.setAttribute('applyNumberFormat','1');xfs.appendChild(xf);xfs.setAttribute('count',String(xfs.children.length));zip.file('xl/styles.xml',serializer.serializeToString(styles));
 // Dedicated cell style for exported dossiers: centered in both directions, wrapped.
 const dossierStyleIndex=xfs.children.length;
 const dossierXf=xfs.children[0].cloneNode(true);
 dossierXf.setAttribute('applyAlignment','1');
 let dossierAlignment=Array.from(dossierXf.children).find(x=>x.localName==='alignment');
 if(!dossierAlignment){dossierAlignment=styles.createElementNS(fluxNS,'alignment');dossierXf.appendChild(dossierAlignment);}
 dossierAlignment.setAttribute('horizontal','center');dossierAlignment.setAttribute('vertical','center');dossierAlignment.setAttribute('wrapText','1');
 xfs.appendChild(dossierXf);xfs.setAttribute('count',String(xfs.children.length));
 const dossierDateStyleIndex=xfs.children.length;
 const dossierDateXf=dossierXf.cloneNode(true);dossierDateXf.setAttribute('numFmtId','180');dossierDateXf.setAttribute('applyNumberFormat','1');xfs.appendChild(dossierDateXf);xfs.setAttribute('count',String(xfs.children.length));
 zip.file('xl/styles.xml',serializer.serializeToString(styles));
 const setExcelDate=(doc,row,col,d)=>{fluxCell(doc,row,col,d?dateSerial(d):'');const ref=fluxColumnName(col)+row.getAttribute('r');const cell=Array.from(row.children).find(x=>x.getAttribute('r')===ref);if(cell&&d)cell.setAttribute('s',String(dateStyleIndex));};
 const dossier=await load('xl/worksheets/sheet2.xml'),base=await load('xl/worksheets/sheet5.xml');
 const stats=new Map(),daily=new Map();
 const blank=()=>({total:0,loaded:0,notLoaded:0,saved:0,cancelled:0,other:0,expected:0});
 for(const d of dates)daily.set(d,blank());
 for(let i=0;i<1735;i++){
  const e=entries[i];let values=Array(14).fill('');
  if(e){const r=e.r,cie=String(pick(r,fields[0])).toUpperCase(),tag=tagList(pick(r,fields[3]));
   values=[fluxDate(e.date),cie,(cie+String(pick(r,fields[1])).trim().replace(new RegExp('^'+cie,'i'),'')),String(pick(r,fields[2])),tag.join('\n'),tag.length,...fields.slice(4).map(f=>String(pick(r,f)))];
   values[12]=status(r)==='CHARGE'?'CHARGÉ':status(r)==='NON CHARGE'?'NON CHARGÉ':status(r)==='SAUVE'?'SAUVÉ':status(r)==='ANNULE'?'ANNULÉ':String(pick(r,fields[10]));
   const key=statusKey(r);if(!stats.has(cie))stats.set(cie,blank());for(const m of [stats.get(cie),daily.get(e.date)]){m.total++;m[key]++;}
  }
  fluxWriteCells(dossier,6+i,values);fluxWriteCells(base,6+i,values);
  const dossierRow=fluxRow(dossier,dossier.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);
  dossierRow.setAttribute('ht',e?'36':'22');dossierRow.setAttribute('customHeight','1');
  for(const cell of Array.from(dossierRow.children).filter(x=>x.localName==='c'))cell.setAttribute('s',String(dossierStyleIndex));
  if(e){for(const doc of [dossier,base]){const rr=fluxRow(doc,doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);setExcelDate(doc,rr,0,e.date);if(doc===dossier){const dateCell=Array.from(rr.children).find(x=>x.getAttribute('r')==='A'+(6+i));if(dateCell)dateCell.setAttribute('s',String(dossierDateStyleIndex));}}}
 }
 // Expected baggage counts are independent user-entered KPI values, not dossier counts.
 const expectedByDate=new Map(),expectedByAirline=new Map();
 const allCodes=new Set([...stats.keys()]);
 for(const date of dates){
  const month=date.slice(0,7),dailyValues=metadata['flux_bags_expected_daily_'+date];
  const dayMap=new Map();
  if(dailyValues&&typeof dailyValues==='object')for(const [raw,v] of Object.entries(dailyValues)){
   const code=raw.trim().toUpperCase();if((!company||company.toUpperCase()===code)&&Number.isSafeInteger(Number(v))&&Number(v)>=0){dayMap.set(code,Number(v));allCodes.add(code);}
  }
  expectedByDate.set(date,dayMap);
 }
 // Monthly values are a legacy fallback only when no daily inputs exist for that month.
 const months=[...new Set(dates.map(d=>d.slice(0,7)))];
 for(const month of months){
  const monthDates=dates.filter(d=>d.startsWith(month));
  const hasDaily=Object.keys(metadata).some(k=>k.startsWith('flux_bags_expected_daily_'+month+'-'));
  if(!hasDaily){
   const legacy=metadata['flux_bags_expected_'+month]||{};
   for(const [raw,v] of Object.entries(legacy)){
    const code=raw.trim().toUpperCase();if((!company||company.toUpperCase()===code)&&Number.isSafeInteger(v)&&v>=0){allCodes.add(code);expectedByAirline.set(code,(expectedByAirline.get(code)||0)+Number(v));}
   }
  }else for(const date of monthDates)for(const [code,v] of expectedByDate.get(date))expectedByAirline.set(code,(expectedByAirline.get(code)||0)+v);
 }
 for(const [code,v] of expectedByAirline){if(!stats.has(code))stats.set(code,blank());stats.get(code).expected=v;}
 const sharedRaw=await zip.file('xl/sharedStrings.xml')?.async('string');
 const sharedDoc=sharedRaw?parser.parseFromString(sharedRaw,'application/xml'):null;
 const shared=sharedDoc?Array.from(sharedDoc.getElementsByTagNameNS(fluxNS,'si')).map(si=>Array.from(si.getElementsByTagNameNS(fluxNS,'t')).map(t=>t.textContent).join('')):[];
 const cellText=(doc,ref)=>{const cell=Array.from(doc.getElementsByTagNameNS(fluxNS,'c')).find(x=>x.getAttribute('r')===ref);if(!cell)return '';const v=cell.getElementsByTagNameNS(fluxNS,'v')[0]?.textContent||'';return cell.getAttribute('t')==='s'?(shared[Number(v)]||''):cell.getElementsByTagNameNS(fluxNS,'t')[0]?.textContent||v;};
 zip.file('xl/worksheets/sheet2.xml',serializer.serializeToString(dossier));
 zip.file('xl/worksheets/sheet5.xml',serializer.serializeToString(base));
 // Refresh the source dates and expected-baggage inputs used by the existing formula dashboards.
 const recap=await load('xl/worksheets/sheet1.xml'),synth=await load('xl/worksheets/sheet4.xml'),daySheet=await load('xl/worksheets/sheet3.xml');
 // A company-scoped export must not keep the other airlines from the template.
 const selectedCompany=String(company||'').trim().toUpperCase();
 const companyNamesForExport={AI:'AIR INDIA',AT:'ROYAL AIR MAROC',AV:'AVIANCA',DE:'CONDOR',EI:'AER LINGUS',FI:'ICELANDAIR',HF:'AIR CÔTE D’IVOIRE',JU:'AIR SERBIA',KU:'KUWAIT AIRWAYS',LA:'LATAM AIRLINES',LO:'LOT POLISH AIRLINES',MH:'MALAYSIA AIRLINES',RJ:'ROYAL JORDANIAN',SB:'AIRCALIN',SK:'SAS',SQ:'SINGAPORE AIRLINES',TK:'TURKISH AIRLINES',TW:'T’WAY AIR',WB:'RWANDAIR'};
 const companyTitle=selectedCompany?selectedCompany+' — '+(companyNamesForExport[selectedCompany]||selectedCompany):'';
 if(selectedCompany){
  // Update each merged heading's anchor; no merged ranges or chart objects are removed.
  for(const [doc,title] of [[recap,'RÉCAPITULATIF'],[dossier,'DOSSIERS'],[daySheet,'JOUR PAR JOUR'],[synth,'SYNTHÈSE PAR DATE'],[base,'BASE']]){
   const heading=fluxRow(doc,doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],1);
   fluxCell(doc,heading,0,'FLUX BAGAGES — '+title+' — '+companyTitle);
  }
  // The daily dashboard expects row 9 to correspond to column I in the date synthesis.
  for(let i=0;i<14;i++){
   const dayRow=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],9+i);
   fluxCell(daySheet,dayRow,0,i===0?selectedCompany:'');
   const synthHeader=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],5);
   fluxCell(synth,synthHeader,8+i,i===0?selectedCompany:'');
  }
  // Clear the chart helper categories for nonselected airlines (the chart uses AA:AE).
  for(let i=1;i<14;i++){
   const helper=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],14+i);
   fluxCell(recap,helper,26,'');
   for(let j=27;j<=30;j++)fluxCell(recap,helper,j,'');
  }
 }
 if(selectedCompany){
  // Row 3 is the visible subtitle on the official template, not row 1.
  const periodLabel=period==='month'?new Date(from+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase():period==='year'?from.slice(0,4):period==='day'?fluxDate(from):fluxDate(from)+' AU '+fluxDate(to);
  const subtitle='COMPTE RENDU DE SUPERVISION  •  '+periodLabel+'  •  '+companyTitle;
  for(const doc of [recap,dossier,daySheet,synth,base]){
   fluxCell(doc,fluxRow(doc,doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],3),0,subtitle);
  }
  // The chart's categories start at AA13, so keep one single series category.
  const header=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],13);
  fluxCell(recap,header,26,selectedCompany);
  // Source values for the four stacked status series of chart 1.
  const selectedStats=stats.get(selectedCompany)||blank();
  [selectedStats.saved,selectedStats.loaded,selectedStats.notLoaded,selectedStats.cancelled].forEach((value,j)=>fluxCell(recap,header,27+j,value));
  for(let i=0;i<14;i++){
   const rr=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],14+i);
   for(let j=26;j<=30;j++)fluxCell(recap,rr,j,'');
   if(i>0)rr.setAttribute('hidden','1');else rr.removeAttribute('hidden');
   const dr=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],9+i);
   dr.removeAttribute('hidden');dr.removeAttribute('outlineLevel');dr.removeAttribute('collapsed');
  }
  // Keep the selected airline visible: the template groups rows 9:22.
  const selectedDayRow=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],9);
  selectedDayRow.removeAttribute('hidden');selectedDayRow.removeAttribute('collapsed');selectedDayRow.removeAttribute('outlineLevel');
  selectedDayRow.setAttribute('ht','23');selectedDayRow.setAttribute('customHeight','1');
  fluxCell(daySheet,selectedDayRow,0,selectedCompany);
  // Show the total immediately after the single airline, preserving its formulas.
  const dayTotal=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],23);
  dayTotal.removeAttribute('hidden');dayTotal.removeAttribute('collapsed');dayTotal.removeAttribute('outlineLevel');
  // Do not overwrite the B:G daily formulas: they recalculate when C5 changes.
  // Build a single visible, formula-driven airline row; the original template
  // had fixed formulas and row groups that did not reliably unhide in Excel.
  const dayData=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  const visibleDayRow=fluxRow(daySheet,dayData,9);
  visibleDayRow.removeAttribute('hidden');visibleDayRow.removeAttribute('collapsed');visibleDayRow.removeAttribute('outlineLevel');
  visibleDayRow.setAttribute('ht','25');visibleDayRow.setAttribute('customHeight','1');
  fluxCell(daySheet,visibleDayRow,0,selectedCompany);
  const expectedFormula="IFERROR(INDEX('SYNTHÈSE PAR DATE'!$I$6:$I$36,MATCH($C$5,'SYNTHÈSE PAR DATE'!$A$6:$A$36,0)),0)";
  const dayFormulas=[expectedFormula,
   'COUNTIFS(BASE!$A$6:$A$1740,$C$5,BASE!$B$6:$B$1740,$A9)',
   'COUNTIFS(BASE!$A$6:$A$1740,$C$5,BASE!$B$6:$B$1740,$A9,BASE!$M$6:$M$1740,"SAUVÉ")',
   'COUNTIFS(BASE!$A$6:$A$1740,$C$5,BASE!$B$6:$B$1740,$A9,BASE!$M$6:$M$1740,"CHARGÉ")',
   'COUNTIFS(BASE!$A$6:$A$1740,$C$5,BASE!$B$6:$B$1740,$A9,BASE!$M$6:$M$1740,"NON CHARGÉ")',
   'COUNTIFS(BASE!$A$6:$A$1740,$C$5,BASE!$B$6:$B$1740,$A9,BASE!$M$6:$M$1740,"ANNULÉ")'];
  for(let i=0;i<6;i++){
   const col=i+1;fluxCell(daySheet,visibleDayRow,col,0);
   const cell=Array.from(visibleDayRow.children).find(x=>x.getAttribute('r')===fluxColumnName(col)+'9');
   const oldValue=Array.from(cell.children).find(x=>x.localName==='v');if(oldValue)cell.removeChild(oldValue);
   const formula=daySheet.createElementNS(fluxNS,'f');formula.textContent=dayFormulas[i];cell.insertBefore(formula,cell.firstChild);
  }
  // Total is always the same as the single selected airline, not the hidden template rows.
  const totalRow=fluxRow(daySheet,dayData,23);
  totalRow.removeAttribute('hidden');totalRow.removeAttribute('collapsed');totalRow.removeAttribute('outlineLevel');
  for(let col=1;col<=6;col++){
   fluxCell(daySheet,totalRow,col,0);
   const cell=Array.from(totalRow.children).find(x=>x.getAttribute('r')===fluxColumnName(col)+'23');
   const value=Array.from(cell.children).find(x=>x.localName==='v');if(value)cell.removeChild(value);
   const formula=daySheet.createElementNS(fluxNS,'f');formula.textContent=fluxColumnName(col)+'9';cell.insertBefore(formula,cell.firstChild);
  }
  // Explicitly clear outline grouping that can collapse the selected row.
  const sheetPr=daySheet.getElementsByTagNameNS(fluxNS,'sheetPr')[0];
  const outlinePr=sheetPr?Array.from(sheetPr.children).find(x=>x.localName==='outlinePr'):null;
  if(outlinePr){outlinePr.setAttribute('showSummaryBelow','1');outlinePr.setAttribute('summaryBelow','1');}
  // Keep only the selected airline's expected-baggage input in the synthesis.
  const head=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],5);
  for(let j=8;j<22;j++)fluxCell(synth,head,j,j===8?selectedCompany:'');
 }
 // All exports (including ALL companies) must reflect the chosen reporting period.
 if(!selectedCompany){
  const periodLabel=period==='month'?new Date(from.slice(0,7)+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase():period==='day'?fluxDate(from):fluxDate(from)+' AU '+fluxDate(to);
  const subtitle='COMPTE RENDU DE SUPERVISION  •  '+periodLabel+'  •  TOUTES COMPAGNIES';
  for(const doc of [recap,dossier,daySheet,synth,base])fluxCell(doc,fluxRow(doc,doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],3),0,subtitle);
  zip.file('xl/worksheets/sheet2.xml',serializer.serializeToString(dossier));
  zip.file('xl/worksheets/sheet5.xml',serializer.serializeToString(base));
 }
 const templateCodes=Array.from({length:14},(_,i)=>cellText(recap,'A'+(14+i)).trim().toUpperCase()).filter(Boolean);
 const airlines=selectedCompany?[selectedCompany]:[...new Set([...templateCodes,...allCodes])].filter(code=>allCodes.has(code));
 if(airlines.length>14)throw new Error('Le modèle officiel permet 14 compagnies maximum ('+airlines.length+' sélectionnées).');
 for(let i=0;i<14;i++){
  const row=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],14+i);
  fluxCell(recap,row,0,airlines[i]||'');
  fluxCell(recap,row,3,expectedByAirline.get(airlines[i])||0);
  // Chart categories are maintained in row 13, not duplicated here.
 }
 for(let i=0;i<31;i++){
  const d=dates[i],row=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);
   // Preserve formula cells and update only operational expected values.
  setExcelDate(synth,row,0,d);
  for(let col=8;col<22;col++){
   const code=selectedCompany?(col===8?selectedCompany:''):cellText(synth,fluxColumnName(col)+'5').trim().toUpperCase();
   fluxCell(synth,row,col,selectedCompany&&col>8?'':d?(expectedByDate.get(d)?.get(code)??''):'');
  }
  // Keep all other existing formula cells, only update expected count input if it is not a formula.
  const expectedCell=Array.from(row.children).find(c=>c.getAttribute('r')==='D'+(6+i));
  if(expectedCell&&!Array.from(expectedCell.children).some(c=>c.localName==='f'))fluxCell(synth,row,3,d?Array.from(expectedByDate.get(d)?.values()||[]).reduce((a,b)=>a+b,0):'');
 }
 // Compact synthesis to the actual dates, with the TOTAL directly below.
 // Never leave formula-filled but undated template rows visible.
 {
  const data=synth.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  const count=Math.min(dates.length,31);
  const totalAt=6+count;
  const sourceTotal=Array.from(data.children).find(n=>n.localName==='row'&&Number(n.getAttribute('r'))===37);
  const styles=sourceTotal?Array.from(sourceTotal.children).filter(n=>n.localName==='c').map(n=>({col:fluxColumn(n.getAttribute('r')),style:n.getAttribute('s')})):[];
  for(const row of Array.from(data.children).filter(n=>n.localName==='row')){
   const n=Number(row.getAttribute('r'));
   if(n>=totalAt&&n<=37)data.removeChild(row);
  }
  const total=fluxRow(synth,data,totalAt);
  total.removeAttribute('hidden');total.setAttribute('ht','24');total.setAttribute('customHeight','1');
  fluxCell(synth,total,0,'TOTAL');
  for(let col=1;col<=8;col++){
   fluxCell(synth,total,col,0);
   const cell=Array.from(total.children).find(n=>n.getAttribute('r')===fluxColumnName(col)+totalAt);
   const value=Array.from(cell.children).find(n=>n.localName==='v');if(value)cell.removeChild(value);
   const f=synth.createElementNS(fluxNS,'f');f.textContent='SUM('+fluxColumnName(col)+'6:'+fluxColumnName(col)+(totalAt-1)+')';cell.insertBefore(f,cell.firstChild);
   const style=styles.find(s=>s.col===col)?.style;if(style!==undefined&&style!==null)cell.setAttribute('s',style);
  }
  for(const row of Array.from(data.children).filter(n=>n.localName==='row'&&Number(n.getAttribute('r'))>=6&&Number(n.getAttribute('r'))<=totalAt)){
   row.removeAttribute('hidden');row.removeAttribute('collapsed');row.removeAttribute('outlineLevel');
  }
  const format=synth.getElementsByTagNameNS(fluxNS,'sheetFormatPr')[0];if(format)format.removeAttribute('zeroHeight');
 }
 // Restore the date dropdown at C5, backed by a list of dates in hidden helper column AA.
 const dateOptions=dates.slice(0,31);
 for(let i=0;i<31;i++){const dr=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],5+i);setExcelDate(daySheet,dr,26,dateOptions[i]);}
 const data=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],chosen=fluxRow(daySheet,data,5);
 const current=Array.from(chosen.children).find(c=>c.getAttribute('r')==='C5');
 // Never retain C5 from the source template: it may belong to a different month.
 setExcelDate(daySheet,chosen,2,dateOptions[0]);
 let dvs=daySheet.getElementsByTagNameNS(fluxNS,'dataValidations')[0];
 if(!dvs){dvs=daySheet.createElementNS(fluxNS,'dataValidations');const ext=Array.from(daySheet.documentElement.children).find(x=>['hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','drawing','legacyDrawing','extLst'].includes(x.localName));daySheet.documentElement.insertBefore(dvs,ext||null);}
 for(const v of Array.from(dvs.children))if(v.getAttribute('sqref')==='C5')dvs.removeChild(v);
 const dv=daySheet.createElementNS(fluxNS,'dataValidation');dv.setAttribute('type','list');dv.setAttribute('allowBlank','0');dv.setAttribute('showDropDown','0');dv.setAttribute('sqref','C5');
 const f=daySheet.createElementNS(fluxNS,'formula1');f.textContent='$AA$5:$AA'+(4+Math.max(1,dateOptions.length));dv.appendChild(f);dvs.appendChild(dv);dvs.setAttribute('count',String(dvs.children.length));
 // Final visibility pass: Excel must show row 9 (EI) and its I9 note.
 // Explicitly restore visibility AFTER all template-specific row manipulation.
 if(selectedCompany){
  const data=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  const airlineRow=fluxRow(daySheet,data,9);
  for(const key of ['hidden','collapsed','outlineLevel','thickTop','thickBot'])airlineRow.removeAttribute(key);
  airlineRow.setAttribute('ht','26');airlineRow.setAttribute('customHeight','1');
  fluxCell(daySheet,airlineRow,0,selectedCompany);
  // I9 is the permanent guidance cell in the original template; preserve it.
  const note=Array.from(airlineRow.children).find(x=>x.getAttribute('r')==='I9');
  if(note&&note.getAttribute('t')==='inlineStr')note.removeAttribute('hidden');
  // Unhide the row at the worksheet level even when Excel inherited an outline group.
  const format=daySheet.getElementsByTagNameNS(fluxNS,'sheetFormatPr')[0];
  if(format)format.removeAttribute('zeroHeight');
  for(let i=10;i<=22;i++){
   const row=fluxRow(daySheet,data,i);row.removeAttribute('hidden');row.removeAttribute('outlineLevel');row.removeAttribute('collapsed');
  }
 }
 // Final daily layout: no hidden airline rows, and TOTAL immediately follows the airlines.
 {
  const data=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  const count=selectedCompany?1:Math.max(1,Math.min(14,airlines.length));
  const totalAt=9+count;
  const originalTotal=fluxRow(daySheet,data,23);
  const totalStyle=Array.from(originalTotal.children).filter(n=>n.localName==='c').map(n=>({col:fluxColumn(n.getAttribute('r')),style:n.getAttribute('s')}));
  // Remove obsolete template rows, rather than hiding them (Excel skips hidden rows).
  for(const row of Array.from(data.children).filter(n=>n.localName==='row')){
   const n=Number(row.getAttribute('r'));
   if(n>=9&&n<=23&&n>=totalAt)data.removeChild(row);
  }
  for(let n=9;n<totalAt;n++){
   const row=fluxRow(daySheet,data,n);
   for(const attr of ['hidden','collapsed','outlineLevel'])row.removeAttribute(attr);
   row.setAttribute('ht','24');row.setAttribute('customHeight','1');
  }
  const total=fluxRow(daySheet,data,totalAt);
  total.removeAttribute('hidden');total.removeAttribute('collapsed');total.removeAttribute('outlineLevel');
  total.setAttribute('ht','24');total.setAttribute('customHeight','1');
  fluxCell(daySheet,total,0,'TOTAL JOUR');
  for(let j=1;j<=6;j++){
   fluxCell(daySheet,total,j,0);
   const cell=Array.from(total.children).find(n=>n.getAttribute('r')===fluxColumnName(j)+totalAt);
   const existing=Array.from(cell.children).find(n=>n.localName==='v');if(existing)cell.removeChild(existing);
   const formula=daySheet.createElementNS(fluxNS,'f');formula.textContent='SUM('+fluxColumnName(j)+'9:'+fluxColumnName(j)+(totalAt-1)+')';cell.insertBefore(formula,cell.firstChild);
  }
  for(const {col,style} of totalStyle){const cell=Array.from(total.children).find(n=>n.getAttribute('r')===fluxColumnName(col)+totalAt);if(cell&&style!==null)cell.setAttribute('s',style);}
  // Keep the original note visible, but move it from I9 to I8.
  const oldNoteRow=fluxRow(daySheet,data,9),newNoteRow=fluxRow(daySheet,data,8);
  const oldNote=Array.from(oldNoteRow.children).find(n=>n.getAttribute('r')==='I9');
  if(oldNote){const existing=Array.from(newNoteRow.children).find(n=>n.getAttribute('r')==='I8');if(existing)newNoteRow.removeChild(existing);oldNoteRow.removeChild(oldNote);oldNote.setAttribute('r','I8');const next=Array.from(newNoteRow.children).find(n=>n.localName==='c'&&fluxColumn(n.getAttribute('r'))>8);newNoteRow.insertBefore(oldNote,next||null);}
  const merges=daySheet.getElementsByTagNameNS(fluxNS,'mergeCells')[0];
  if(merges)for(const merge of Array.from(merges.children)){
   const ref=merge.getAttribute('ref')||'';
   if(/^I9(?::[A-Z]+\\d+)?$/.test(ref)){
    const match=ref.match(/^I9(?::([A-Z]+)(\\d+))?$/);
    merge.setAttribute('ref',match&&match[1]?'I8:'+match[1]+(Number(match[2])-1):'I8');
   }
  }
 }
 // Final presentation corrections for the official workbook.
 {
  // I8:M8 is one centered guidance area; keep the note in its anchor I8.
  const merges=daySheet.getElementsByTagNameNS(fluxNS,'mergeCells')[0];
  if(merges){
   for(const node of Array.from(merges.children)){
    const ref=node.getAttribute('ref')||'';
    if(/^I8(?::[A-Z]+8)?$/.test(ref))merges.removeChild(node);
   }
   const merged=daySheet.createElementNS(fluxNS,'mergeCell');merged.setAttribute('ref','I8:M8');merges.appendChild(merged);merges.setAttribute('count',String(merges.children.length));
  }
  const i8=Array.from(fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],8).children).find(n=>n.getAttribute('r')==='I8');
  if(i8){i8.setAttribute('s',String(dossierStyleIndex));}
  // Center synthesis values and dates without changing the formulas or numbers.
  const synthData=synth.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  for(const row of Array.from(synthData.children).filter(n=>n.localName==='row'&&Number(n.getAttribute('r'))>=6&&Number(n.getAttribute('r'))<=36)){
   const dateValue=Array.from(row.children).find(n=>n.getAttribute('r')==='A'+row.getAttribute('r'));
   if(dateValue)dateValue.setAttribute('s',String(dossierDateStyleIndex));
   for(const cell of Array.from(row.children).filter(n=>n.localName==='c')){
    if(cell===dateValue)continue;
    const formula=Array.from(cell.children).find(n=>n.localName==='f');
    const value=Array.from(cell.children).find(n=>n.localName==='v');
    if(!formula&&value&&value.textContent==='0'){
     // Zero expected-baggage inputs are empty, not visible zeroes.
     if(fluxColumn(cell.getAttribute('r'))>=8)value.parentNode.removeChild(value);
    }
    cell.setAttribute('s',String(dossierStyleIndex));
   }
  }
 }
 // Never export a hidden day-by-day row. For a single airline, unused rows
 // have already been physically removed above, not hidden.
 {
  const data=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  for(const row of Array.from(data.children).filter(n=>n.localName==='row')){
   row.removeAttribute('hidden');row.removeAttribute('collapsed');row.removeAttribute('outlineLevel');
   if(Number(row.getAttribute('r'))>=9&&Number(row.getAttribute('r'))<=23){
    row.setAttribute('ht','24');row.setAttribute('customHeight','1');
   }
  }
  const fmt=daySheet.getElementsByTagNameNS(fluxNS,'sheetFormatPr')[0];
  if(fmt)fmt.removeAttribute('zeroHeight');
 }
 // Repair remaining presentation details without altering operational dossier data.
 {
  const merges=daySheet.getElementsByTagNameNS(fluxNS,'mergeCells')[0];
  if(merges){
   for(const node of Array.from(merges.children)){
    const ref=node.getAttribute('ref')||'';
    if(/^I9(?::[A-Z]+\\d+)?$/.test(ref))merges.removeChild(node);
   }
   merges.setAttribute('count',String(merges.children.length));
  }
  const dayTotal=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],9+(selectedCompany?1:Math.max(1,Math.min(14,airlines.length))));
  const dayTotalCells=Array.from(dayTotal.children).filter(n=>n.localName==='c');
  const dayTotalStyles=new Map(dayTotalCells.map(n=>[fluxColumn(n.getAttribute('r')),n.getAttribute('s')]));
  const synthTotal=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+Math.min(dates.length,31));
  for(const cell of Array.from(synthTotal.children).filter(n=>n.localName==='c')){
   const style=dayTotalStyles.get(fluxColumn(cell.getAttribute('r')));
   if(style!==null&&style!==undefined)cell.setAttribute('s',style);
  }
  // Source expected-baggage counts come from daily metadata, never dossier totals.
  // Do not silently replace missing source entries with an invented zero.
  for(let i=0;i<Math.min(dates.length,31);i++){
   const date=dates[i],row=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);
   const expected=expectedByDate.get(date)?.get(selectedCompany);
   if(selectedCompany)fluxCell(synth,row,8,expected===undefined?'':expected);
  }
 }
 // Open at A1 on every worksheet, not at the last saved template scroll position.
 for(const file of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml','xl/worksheets/sheet4.xml','xl/worksheets/sheet5.xml']){
  const doc=file.endsWith('sheet1.xml')?recap:file.endsWith('sheet2.xml')?dossier:file.endsWith('sheet3.xml')?daySheet:file.endsWith('sheet4.xml')?synth:base;
  const views=doc.getElementsByTagNameNS(fluxNS,'sheetViews')[0];
  if(views)for(const view of Array.from(views.children).filter(n=>n.localName==='sheetView')){
   view.setAttribute('topLeftCell','A1');
   // Excel stores the scrolling position of frozen sheets on the pane itself.
   // Resetting only sheetView and selection leaves the lower pane at row 85.
   const pane=Array.from(view.children).find(n=>n.localName==='pane');
   const frozenRows=pane?Math.max(0,Number(pane.getAttribute('ySplit'))||0):0;
   const frozenCols=pane?Math.max(0,Number(pane.getAttribute('xSplit'))||0):0;
   const firstScrollable=fluxColumnName(frozenCols)+(frozenRows+1);
   if(pane){
    pane.setAttribute('topLeftCell',firstScrollable);
    pane.setAttribute('activePane',frozenRows&&frozenCols?'bottomRight':frozenRows?'bottomLeft':frozenCols?'topRight':'bottomLeft');
   }
   for(const selection of Array.from(view.children).filter(n=>n.localName==='selection'))view.removeChild(selection);
   const selection=doc.createElementNS(fluxNS,'selection');
   if(pane)selection.setAttribute('pane',pane.getAttribute('activePane'));
   selection.setAttribute('activeCell',firstScrollable);
   selection.setAttribute('sqref',firstScrollable);
   view.appendChild(selection);
  }
  zip.file(file,serializer.serializeToString(doc));
 }
 zip.file('xl/worksheets/sheet3.xml',serializer.serializeToString(daySheet));
 zip.file('xl/worksheets/sheet1.xml',serializer.serializeToString(recap));
 zip.file('xl/worksheets/sheet4.xml',serializer.serializeToString(synth));
 // Save all five modified sheets (including the company-scoped titles and daily layout).
 if(selectedCompany){
  zip.file('xl/worksheets/sheet2.xml',serializer.serializeToString(dossier));
  zip.file('xl/worksheets/sheet5.xml',serializer.serializeToString(base));
 }
 // Remove old formula caches, so Excel recalculates from the new BASE data.
 for(const file of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet3.xml','xl/worksheets/sheet4.xml','xl/worksheets/sheet5.xml']){
  const doc=await load(file);
  for(const c of Array.from(doc.getElementsByTagNameNS(fluxNS,'c'))){
   if(Array.from(c.children).some(x=>x.localName==='f'))for(const v of Array.from(c.children).filter(x=>x.localName==='v'))c.removeChild(v);
  }
  zip.file(file,serializer.serializeToString(doc));
 }
 const wb=await load('xl/workbook.xml'),calc=wb.getElementsByTagNameNS(fluxNS,'calcPr')[0]||wb.createElementNS(fluxNS,'calcPr');
 const bookViews=wb.getElementsByTagNameNS(fluxNS,'bookViews')[0];
 if(bookViews)for(const view of Array.from(bookViews.children).filter(n=>n.localName==='workbookView')){
  view.setAttribute('activeTab','0');view.setAttribute('firstSheet','0');
 }
 calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');calc.setAttribute('calcMode','auto');if(!calc.parentNode)wb.documentElement.appendChild(calc);
 zip.file('xl/workbook.xml',serializer.serializeToString(wb));
 // A modified formula workbook must not retain its stale calculation chain.
 zip.remove('xl/calcChain.xml');
 const relPath='xl/_rels/workbook.xml.rels',relRaw=await zip.file(relPath)?.async('string');
 if(relRaw){const relDoc=parser.parseFromString(relRaw,'application/xml');for(const el of Array.from(relDoc.documentElement.children))if((el.getAttribute('Type')||'').endsWith('/calcChain'))el.remove();zip.file(relPath,serializer.serializeToString(relDoc));}
 const typesRaw=await zip.file('[Content_Types].xml')?.async('string');
 if(typesRaw){const typesDoc=parser.parseFromString(typesRaw,'application/xml');for(const el of Array.from(typesDoc.documentElement.children))if(el.getAttribute('PartName')==='/xl/calcChain.xml')el.remove();zip.file('[Content_Types].xml',serializer.serializeToString(typesDoc));}
 // Preserve original chart XML untouched: manual chart rewrites triggered Excel repair.
 // Ensure the purple ANNULÉS header fits on one line.
 {
  const data=recap.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  const row=fluxRow(recap,data,13);row.setAttribute('ht','36');row.setAttribute('customHeight','1');
 }
 // Presentation rules for filtered exports.
 {
  // Column I mirrors the daily expected-baggage total in D whenever A is dated.
  const data=synth.getElementsByTagNameNS(fluxNS,'sheetData')[0];
  for(let i=0;i<Math.min(dates.length,31);i++){
   const row=fluxRow(synth,data,6+i),cellRef='I'+(6+i);
   fluxCell(synth,row,8,0);
   const cell=Array.from(row.children).find(n=>n.getAttribute('r')===cellRef);
   for(const n of Array.from(cell.children).filter(n=>n.localName==='v'))cell.removeChild(n);
   const f=synth.createElementNS(fluxNS,'f');f.textContent='IF(A'+(6+i)+'="",0,D'+(6+i)+')';cell.insertBefore(f,cell.firstChild);
  }
  const totalAt=6+Math.min(dates.length,31),row=fluxRow(synth,data,totalAt);
  fluxCell(synth,row,8,0);
  const totalCell=Array.from(row.children).find(n=>n.getAttribute('r')==='I'+totalAt);
  for(const n of Array.from(totalCell.children).filter(n=>n.localName==='v'))totalCell.removeChild(n);
  const totalFormula=synth.createElementNS(fluxNS,'f');totalFormula.textContent='SUM(I6:I'+(totalAt-1)+')';totalCell.insertBefore(totalFormula,totalCell.firstChild);
  const style=Array.from(row.children).find(n=>n.getAttribute('r')==='H'+totalAt)?.getAttribute('s');
  if(style!==null&&style!==undefined)totalCell.setAttribute('s',style);
  // Disable wrapping on H13 without changing its background or text.
  const header=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],13);
  const h13=Array.from(header.children).find(n=>n.getAttribute('r')==='H13');
  if(h13){
   const stylesDoc=parser.parseFromString(await zip.file('xl/styles.xml').async('string'),'application/xml');
   const xfs=stylesDoc.getElementsByTagNameNS(fluxNS,'cellXfs')[0];
   const base=Array.from(xfs.children)[Number(h13.getAttribute('s'))||0];
   if(base){
    const clone=base.cloneNode(true);clone.setAttribute('applyAlignment','1');
    let align=Array.from(clone.children).find(n=>n.localName==='alignment');
    if(!align){align=stylesDoc.createElementNS(fluxNS,'alignment');clone.appendChild(align);}
    align.setAttribute('wrapText','0');align.setAttribute('horizontal','center');align.setAttribute('vertical','center');
    xfs.appendChild(clone);xfs.setAttribute('count',String(xfs.children.length));
    h13.setAttribute('s',String(xfs.children.length-1));
    zip.file('xl/styles.xml',serializer.serializeToString(stylesDoc));
   }
  }
 }
 // Keep chart XML intact and avoid dynamic regular expressions in the export path.
 // Chart labels are handled separately from the workbook data.
 // Preserve embedded chart caches and drawing relationships from the official template.
 // Removing chart caches caused Excel to display blank/missing charts.
 const buffer=await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 const name='FLUX_BAGAGES_SUPERVISION_'+(period==='range'?from+'_au_'+to:period==='month'?from.slice(0,7):from)+'_'+(company||'TOUTES')+'.xlsx';
 download(buffer,name);
 return {name,dossiers:entries.length,compagnies:airlines.length,jours:dates.length};
}
