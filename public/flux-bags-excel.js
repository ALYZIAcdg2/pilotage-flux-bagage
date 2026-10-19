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
function fluxDate(s){if(!s)return '';const [y,m,d]=String(s).slice(0,10).split('-');return d+'/'+m+'/'+y;}
function fluxRows({dataset,period,from,to,company}){
 const dates=Object.keys(dataset).filter(d=>period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):d>=from&&d<=to).sort();
 const entries=dates.flatMap(date=>(dataset[date]||[]).filter(r=>!company||String(pick(r,fields[0])).trim().toUpperCase()===company.toUpperCase()).map(r=>({date,r})));
 return {dates,entries};
}
 const dateSerial=d=>Math.round((Date.parse(d+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
 const setExcelDate=(doc,row,col,d)=>{fluxCell(doc,row,col,d?dateSerial(d):'');const ref=fluxColumnName(col)+row.getAttribute('r');const cell=Array.from(row.children).find(x=>x.getAttribute('r')===ref);if(cell&&d)cell.setAttribute('s','1');};
export async function exportFluxExcel({dataset,metadata={},period,from,to,company}){
 window.__fluxExportMetadata=metadata;
 const {dates,entries}=fluxRows({dataset,period,from,to,company});
 if(entries.length>1735)throw new Error('Le modèle officiel contient 1 735 lignes de dossiers maximum. Export annulé pour éviter toute perte de données ('+entries.length+' dossiers).');
 const JSZip=await fluxLoadZip();
 const response=await fetch('/ALYZIA_FLUX_BAGAGES.xlsx?v=official-20261019',{cache:'no-store'});
 if(!response.ok)throw new Error('Modèle officiel introuvable sur le serveur (HTTP '+response.status+')');
 const zip=await JSZip.loadAsync(await response.arrayBuffer());
 const parser=new DOMParser(),serializer=new XMLSerializer();
 const load=async file=>{const raw=await zip.file(file)?.async('string');if(!raw)throw new Error('Feuille du modèle manquante : '+file);const doc=parser.parseFromString(raw,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('XML invalide : '+file);return doc;};
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
  if(e){for(const doc of [dossier,base]){const rr=fluxRow(doc,doc.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);setExcelDate(doc,rr,0,e.date);}}
 }
 // Expected baggage counts are independent user-entered KPI values, not dossier counts.
 const expectedByDate=new Map(),expectedByAirline=new Map();
 const allCodes=new Set([...stats.keys()]);
 for(const date of dates){
  const month=date.slice(0,7),dailyValues=metadata['flux_bags_expected_daily_'+date];
  const dayMap=new Map();
  if(dailyValues&&typeof dailyValues==='object')for(const [raw,v] of Object.entries(dailyValues)){
   const code=raw.trim().toUpperCase();if((!company||company.toUpperCase()===code)&&Number.isSafeInteger(v)&&v>=0){dayMap.set(code,v);allCodes.add(code);}
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
    const code=raw.trim().toUpperCase();if((!company||company.toUpperCase()===code)&&Number.isSafeInteger(v)&&v>=0){allCodes.add(code);expectedByAirline.set(code,(expectedByAirline.get(code)||0)+v);}
   }
  }else for(const date of monthDates)for(const [code,v] of expectedByDate.get(date))expectedByAirline.set(code,(expectedByAirline.get(code)||0)+v);
 }
 for(const [code,v] of expectedByAirline){if(!stats.has(code))stats.set(code,blank());stats.get(code).expected=v;}
 const dateSerial=d=>Math.round((Date.parse(d+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
 const sharedRaw=await zip.file('xl/sharedStrings.xml')?.async('string');
 const sharedDoc=sharedRaw?parser.parseFromString(sharedRaw,'application/xml'):null;
 const shared=sharedDoc?Array.from(sharedDoc.getElementsByTagNameNS(fluxNS,'si')).map(si=>Array.from(si.getElementsByTagNameNS(fluxNS,'t')).map(t=>t.textContent).join('')):[];
 const cellText=(doc,ref)=>{const cell=Array.from(doc.getElementsByTagNameNS(fluxNS,'c')).find(x=>x.getAttribute('r')===ref);if(!cell)return '';const v=cell.getElementsByTagNameNS(fluxNS,'v')[0]?.textContent||'';return cell.getAttribute('t')==='s'?(shared[Number(v)]||''):cell.getElementsByTagNameNS(fluxNS,'t')[0]?.textContent||v;};
 zip.file('xl/worksheets/sheet2.xml',serializer.serializeToString(dossier));
 zip.file('xl/worksheets/sheet5.xml',serializer.serializeToString(base));
 // Refresh the source dates and expected-baggage inputs used by the existing formula dashboards.
 const recap=await load('xl/worksheets/sheet1.xml'),synth=await load('xl/worksheets/sheet4.xml'),daySheet=await load('xl/worksheets/sheet3.xml');
 const airlines=[...allCodes].sort();
 if(airlines.length>14)throw new Error('Le modèle officiel permet 14 compagnies maximum ('+airlines.length+' sélectionnées).');
 for(let i=0;i<14;i++){
  const row=fluxRow(recap,recap.getElementsByTagNameNS(fluxNS,'sheetData')[0],14+i);
  fluxCell(recap,row,0,airlines[i]||'');
  fluxCell(recap,row,3,expectedByAirline.get(airlines[i])||0);
 }
 for(let i=0;i<31;i++){
  const d=dates[i],row=fluxRow(synth,synth.getElementsByTagNameNS(fluxNS,'sheetData')[0],6+i);
   for(let k=8;k<22;k++)fluxCell(synth,row,k,0);
  setExcelDate(synth,row,0,d);
  for(let col=8;col<22;col++){
   const code=cellText(synth,fluxColumnName(col)+'5').trim().toUpperCase();
   fluxCell(synth,row,col,d?(expectedByDate.get(d)?.get(code)||0):0);
  }
  // Keep all other existing formula cells, only update expected count input if it is not a formula.
  const expectedCell=Array.from(row.children).find(c=>c.getAttribute('r')==='D'+(6+i));
  if(expectedCell&&!Array.from(expectedCell.children).some(c=>c.localName==='f'))fluxCell(synth,row,3,d?Array.from(expectedByDate.get(d)?.values()||[]).reduce((a,b)=>a+b,0):0);
 }
 // Restore the date dropdown at C5, backed by a list of dates in hidden helper column AA.
 const dateOptions=dates.slice(0,31);
 for(let i=0;i<31;i++){const dr=fluxRow(daySheet,daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],5+i);setExcelDate(daySheet,dr,26,dateOptions[i]);}
 const data=daySheet.getElementsByTagNameNS(fluxNS,'sheetData')[0],chosen=fluxRow(daySheet,data,5);
 const current=Array.from(chosen.children).find(c=>c.getAttribute('r')==='C5');
 if(!current||!dateOptions.some(d=>String(dateSerial(d))===(current.getElementsByTagNameNS(fluxNS,'v')[0]?.textContent||'')))setExcelDate(daySheet,chosen,2,dateOptions[0]);
 let dvs=daySheet.getElementsByTagNameNS(fluxNS,'dataValidations')[0];
 if(!dvs){dvs=daySheet.createElementNS(fluxNS,'dataValidations');const ext=Array.from(daySheet.documentElement.children).find(x=>['hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','drawing','legacyDrawing','extLst'].includes(x.localName));daySheet.documentElement.insertBefore(dvs,ext||null);}
 for(const v of Array.from(dvs.children))if(v.getAttribute('sqref')==='C5')dvs.removeChild(v);
 const dv=daySheet.createElementNS(fluxNS,'dataValidation');dv.setAttribute('type','list');dv.setAttribute('allowBlank','0');dv.setAttribute('showDropDown','0');dv.setAttribute('sqref','C5');
 const f=daySheet.createElementNS(fluxNS,'formula1');f.textContent='$AA$5:$AA'+(4+Math.max(1,dateOptions.length));dv.appendChild(f);dvs.appendChild(dv);dvs.setAttribute('count',String(dvs.children.length));
 zip.file('xl/worksheets/sheet3.xml',serializer.serializeToString(daySheet));
 zip.file('xl/worksheets/sheet1.xml',serializer.serializeToString(recap));
 zip.file('xl/worksheets/sheet4.xml',serializer.serializeToString(synth));
 // Remove old formula caches, so Excel recalculates from the new BASE data.
 for(const file of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet3.xml','xl/worksheets/sheet4.xml','xl/worksheets/sheet5.xml']){
  const doc=await load(file);
  for(const c of Array.from(doc.getElementsByTagNameNS(fluxNS,'c'))){
   if(Array.from(c.children).some(x=>x.localName==='f'))for(const v of Array.from(c.children).filter(x=>x.localName==='v'))c.removeChild(v);
  }
  zip.file(file,serializer.serializeToString(doc));
 }
 const wb=await load('xl/workbook.xml'),calc=wb.getElementsByTagNameNS(fluxNS,'calcPr')[0]||wb.createElementNS(fluxNS,'calcPr');
 calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');calc.setAttribute('calcMode','auto');if(!calc.parentNode)wb.documentElement.appendChild(calc);
 zip.file('xl/workbook.xml',serializer.serializeToString(wb));
 const buffer=await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 const name='FLUX_BAGAGES_SUPERVISION_'+(period==='range'?from+'_au_'+to:period==='month'?from.slice(0,7):from)+'_'+(company||'TOUTES')+'.xlsx';
 download(buffer,name);
 return {name,dossiers:entries.length,compagnies:airlines.length,jours:dates.length};
}
