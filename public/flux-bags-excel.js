/* Export Excel FLUX BAGAGES — test only. Requires ExcelJS browser bundle. */
const fields=[['cie','compagnie','airline','company'],['flightNumber','vol','numeroVol','flight'],['departureTime','heureDepart','heure'],['tagNumber','tag','numeroTag'],['inboundFlight','volApport'],['arrivalTime','heureArrivee'],['location','localisation'],['remarks','remarques'],['anomaly','anomalie'],['commentAction','commentaireAction','action','commentaire'],['fluxStatus','status'],['faultStation','fault_station']];
const names=['DATE','CIE','N° VOL','HEURE DÉPART','N° TAG','VOL APPORT','HEURE ARRIVÉE','LOCALISATION','REMARQUES','ANOMALIE','COMMENTAIRE/ACTION','STATUT','FAULT STATION'];
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
 const palette=['#10b981','#3b82f6','#ef4444'];
 if(kind==='bar'){const top=90,barH=Math.min(28,370/Math.max(1,rows.length));rows.slice(0,14).forEach((r,i)=>{const y=top+i*(barH+9),values=[num(r.saved),num(r.loaded),num(r.notLoaded)],total=values.reduce((a,b)=>a+b,0);g.fillStyle='#163653';g.font='16px system-ui';g.fillText(String(r.airline||''),35,y+barH*.8);let x=110;values.forEach((v,j)=>{g.fillStyle=palette[j];const w=total?v/total*880:0;g.fillRect(x,y,w,barH);x+=w;});g.fillStyle='#53657a';g.fillText(String(total),1010,y+barH*.8);});}
 if(kind==='line'){const left=75,right=1060,top=105,bottom=450,max=Math.max(1,...rows.flatMap(r=>[num(r.toProcess),num(r.loaded),num(r.notLoaded)]));g.strokeStyle='#e2e8f0';g.fillStyle='#64748b';g.font='16px system-ui';for(let i=0;i<=4;i++){let y=bottom-(bottom-top)*i/4;g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();g.fillText(String(Math.round(max*i/4)),25,y+5);}[['toProcess','#3b82f6'],['loaded','#10b981'],['notLoaded','#ef4444']].forEach(([key,color])=>{g.strokeStyle=color;g.lineWidth=3;g.beginPath();rows.forEach((r,i)=>{const x=left+(rows.length===1?.5:i/(rows.length-1))*(right-left),y=bottom-num(r[key])/max*(bottom-top);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();});g.fillStyle='#64748b';g.fillText(rows[0]?.date||'',left,490);g.fillText(rows.at(-1)?.date||'',right-105,490);}
 if(kind==='kpi'){const total=rows.reduce((a,r)=>a+num(r.toProcess),0);[['Chargés','loaded','#3b82f6'],['Sauvés','saved','#10b981'],['Non chargés','notLoaded','#ef4444']].forEach(([label,key,color],i)=>{const x=190+i*370,y=260,v=rows.reduce((a,r)=>a+num(r[key]),0),pct=total?Math.min(1,v/total):0;g.lineWidth=25;g.strokeStyle='#e2e8f0';g.beginPath();g.arc(x,y,100,0,Math.PI*2);g.stroke();g.strokeStyle=color;g.beginPath();g.arc(x,y,100,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);g.stroke();g.fillStyle='#163653';g.textAlign='center';g.font='bold 32px system-ui';g.fillText(Math.round(pct*100)+'%',x,y+10);g.font='20px system-ui';g.fillText(label,x,410);g.font='16px system-ui';g.fillText(v+' / '+total,x,440);});g.textAlign='left';}
 return c.toDataURL('image/png').split(',')[1];}

const navy='102B49',navy2='173D62',muted='65788D',light='EFF5FA',orange='F97316',white='FFFFFF';
const fill=hex=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+hex}});
const font=(color=navy,size=11,bold=false)=>({name:'Aptos',size,bold,color:{argb:'FF'+color}});
const status=r=>String(pick(r,fields[10])).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function statusKey(r){const v=status(r);return v==='CHARGE'?'loaded':v==='NON CHARGE'?'notLoaded':v==='SAUVE'?'saved':'other';}
function fmtDate(s){if(!s)return '';const [y,m,d]=s.split('-');return d+'/'+m+'/'+y;}
function dateScope(period,from,to){return period==='day'?fmtDate(from):period==='month'?from.slice(0,7).split('-').reverse().join('/'):fmtDate(from)+' — '+fmtDate(to);}
function band(ws,row,a,b,label,color=navy){
 ws.mergeCells(row,a,row,b);const c=ws.getCell(row,a);c.value=label;c.fill=fill(color);c.font=font(white,12,true);c.alignment={vertical:'middle',indent:1};ws.getRow(row).height=28;
}
function hero(ws,title,scope,end){
 ws.mergeCells(1,1,2,end);const c=ws.getCell(1,1);c.value='ALYZIA  |  FLUX BAGAGES  —  '+title;c.font=font(white,20,true);c.fill=fill(navy);c.alignment={vertical:'middle',indent:1};ws.getRow(1).height=26;ws.getRow(2).height=26;
 ws.mergeCells(3,1,3,end);const sub=ws.getCell(3,1);sub.value='COMPTE RENDU DE SUPERVISION  •  '+scope+'  •  Source : PILOTAGE FLUX BAGAGE TEST';sub.font=font(muted,11);sub.alignment={vertical:'middle',indent:1};ws.getRow(3).height=26;
 ws.sheetProperties.pageSetUpPr={fitToPage:true};
}
function metric(ws,row,c1,c2,label,value,color=navy){
 ws.mergeCells(row,c1,row,c2);ws.mergeCells(row+1,c1,row+1,c2);
 const a=ws.getCell(row,c1),b=ws.getCell(row+1,c1);a.value=label;a.fill=fill(color);a.font=font(white,11,true);a.alignment={horizontal:'center',vertical:'middle'};
 b.value=value;b.fill=fill(light);b.font=font(color,23,true);b.alignment={horizontal:'center',vertical:'middle'};ws.getRow(row).height=25;ws.getRow(row+1).height=39;
}
function dataHeader(ws,row,labels){const rr=ws.getRow(row);rr.values=labels;rr.height=34;rr.eachCell(c=>{c.fill=fill(navy2);c.font=font(white,10,true);c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});}
function styleData(ws,first,last,cols,statusColumn){
 for(let i=first;i<=last;i++){const r=ws.getRow(i);r.height=27;for(let j=1;j<=cols;j++){const c=r.getCell(j);c.font=font(navy,10);c.alignment={vertical:'middle',wrapText:true};if(i%2===0)c.fill=fill(light);}
 if(statusColumn){const c=r.getCell(statusColumn),v=status({fluxStatus:c.value});if(v==='CHARGE'){c.fill=fill('DCFCE7');c.font=font('166534',10,true);}else if(v==='NON CHARGE'){c.fill=fill('FFEDD5');c.font=font('9A3412',10,true);}else if(v==='SAUVE'){c.fill=fill('DBEAFE');c.font=font('1D4ED8',10,true);}}
 }
}
function addChart(book,ws,kind,rows,row,col,width=850,height=385){
 if(!rows.length)return;
 const data=pngChart(kind,rows),id=book.addImage({base64:data,extension:'png'});
 ws.addImage(id,{tl:{col,row},ext:{width,height}});
}
export async function exportFluxExcel({dataset,metadata={},period,from,to,company}){
 const ExcelJS=await loadExcelJS(),book=new ExcelJS.Workbook();
 book.creator='ALYZIA CDG2 — PILOTAGE FLUX BAGAGE';book.created=new Date();
 const dates=Object.keys(dataset).filter(d=>period==='day'?d===from:period==='month'?d.slice(0,7)===from.slice(0,7):d>=from&&d<=to).sort();
 const selected=dates.flatMap(date=>(dataset[date]||[]).filter(r=>!company||String(pick(r,fields[0])).toUpperCase()===company).map(r=>({date,r})));
 const grouped=new Map(),daily=new Map(),anomalies=new Map(),locations=new Map();
 const blank=()=>({expected:0,toProcess:0,saved:0,loaded:0,notLoaded:0,other:0});
 for(const date of dates){
  daily.set(date,{date,...blank()});
  for(const {r} of selected.filter(x=>x.date===date)){
   const cie=String(pick(r,fields[0])).toUpperCase()||'AUTRES';
   if(!grouped.has(cie))grouped.set(cie,{airline:cie,...blank()});
   for(const m of [grouped.get(cie),daily.get(date)]){m.toProcess++;m[statusKey(r)]++;}
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
 const total=selected.length,loaded=selected.filter(x=>statusKey(x.r)==='loaded').length,notLoaded=selected.filter(x=>statusKey(x.r)==='notLoaded').length,saved=selected.filter(x=>statusKey(x.r)==='saved').length,other=total-loaded-notLoaded-saved;
 const scope=dateScope(period,from,to)+(company?'  •  '+company:'  •  Toutes compagnies');
 const recap=book.addWorksheet('RÉCAPITULATIF');setup(recap,Array(14).fill(15));recap.views=[{state:'frozen',ySplit:3}];hero(recap,'RÉCAPITULATIF',scope,14);
 metric(recap,5,1,3,'DOSSIERS TOTAL',total);metric(recap,5,4,6,'CHARGÉS',loaded,'168454');metric(recap,5,7,9,'NON CHARGÉS',notLoaded,'C2410C');metric(recap,5,10,12,'SAUVÉS / AUTRES',saved+other,'52667C');
 band(recap,9,1,14,'RÉPARTITION PAR COMPAGNIE');
 dataHeader(recap,10,['COMPAGNIE','DOSSIERS','CHARGÉS','NON CHARGÉS','SAUVÉS','AUTRES','ATTENDUS','% DOSSIERS']);
 for(const r of metrics){const row=recap.addRow([r.airline,r.toProcess,r.loaded,r.notLoaded,r.saved,r.other,r.expected,total?Number((r.toProcess/total*100).toFixed(1)):0]);row.getCell(8).numFmt='0.0"%"';}
 styleData(recap,11,recap.rowCount,8);
 const chartRow=Math.max(14,recap.rowCount+3);band(recap,chartRow,1,14,'GRAPHIQUES — ÉVOLUTION ET RÉPARTITION');
 addChart(book,recap,'line',dailyRows,chartRow,0,740,340);
 addChart(book,recap,'bar',metrics,chartRow+18,0,740,360);
 const dossier=book.addWorksheet('DOSSIERS');setup(dossier,[14,9,13,16,22,17,17,24,25,26,36,18,23]);hero(dossier,'DOSSIERS',scope,13);
 dataHeader(dossier,5,names);for(const {date,r} of selected)dossier.addRow([fmtDate(date),...fields.map(k=>String(pick(r,k)))]);
 styleData(dossier,6,dossier.rowCount,13,12);dossier.views=[{state:'frozen',ySplit:5}];dossier.autoFilter={from:'A5',to:'M'+Math.max(6,dossier.rowCount)};
 for(const date of dates){
  const entries=selected.filter(x=>x.date===date);if(!entries.length)continue;
  const sheet=book.addWorksheet(date.slice(8,10)+'-'+date.slice(5,7));setup(sheet,[14,9,13,16,22,17,17,24,25,26,36,18,23]);
  hero(sheet,'JOUR PAR JOUR',fmtDate(date)+(company?'  •  '+company:''),13);
  const counts={loaded:0,notLoaded:0,saved:0,other:0};for(const {r} of entries)counts[statusKey(r)]++;
  band(sheet,5,1,13,'DOSSIERS : '+entries.length+'     CHARGÉS : '+counts.loaded+'     NON CHARGÉS : '+counts.notLoaded+'     SAUVÉS : '+counts.saved+'     AUTRES : '+counts.other);
  dataHeader(sheet,7,names);for(const {r} of entries)sheet.addRow([fmtDate(date),...fields.map(k=>String(pick(r,k)))]);
  styleData(sheet,8,sheet.rowCount,13,12);sheet.views=[{state:'frozen',ySplit:7}];sheet.autoFilter={from:'A7',to:'M'+Math.max(8,sheet.rowCount)};
 }
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
 addChart(book,graphs,'kpi',metrics,5,0,860,390);addChart(book,graphs,'line',dailyRows,27,0,860,390);addChart(book,graphs,'bar',metrics,49,0,860,390);
 const buffer=await book.xlsx.writeBuffer(),name='FLUX_BAGAGES_SUPERVISION_'+(period==='range'?from+'_au_'+to:period==='month'?from.slice(0,7):from)+'_'+(company||'TOUTES')+'.xlsx';
 download(buffer,name);return {name,dossiers:total,compagnies:metrics.length,jours:dates.length};
}
