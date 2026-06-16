import { useState } from "react";

// Paleta Aeropuertos Argentina 2024
const AA = {
  petroleo:   "#2E5C4F",
  petroleo2:  "#1B3D33",
  grisPlomo:  "#4A4F55",
  grisClaro:  "#8D9299",
  grisBg:     "#F2F4F3",
  blanco:     "#FFFFFF",
  verde:      "#5B9B7A",
  verdeClaro: "#A8D5B5",
  amarillo:   "#E8C84A",
  amarillo2:  "#F0DC7A",
  danger:     "#C0392B",
  texto:      "#1A1F1C",
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// OBJ1 datos
const obj1Forecast = [0.331,0.332,0.330,0.332,0.339,0.346,0.351,0.355,0.362,0.371,0.382,0.382];
const obj1Real     = [0.33, 0.33, 0.33, 0.30, 0.31, null,null,null,null,null,null,null];

// OBJ2 datos
const base2025USD = 94818;
const meta2026USD = base2025USD * 1.15;
const real2026USD = 41122;
const base2025Mensual = [15821,9142,5231,7805,5734,4832,6097,3871,3034,6724,14300,12227];
const real2026Mensual = [12478,10575,8341,5660,4068,null,null,null,null,null,null,null];
const meta2026Mensual = base2025Mensual.map(v => Math.round(v * 1.15));

// OBJ3 datos
const base2025Adq  = 0.036073;
const meta2026Adq  = base2025Adq * 1.25;
const base2025AAdqM = [0.0322,0.0309,0.0319,0.0295,0.0301,0.0303,0.0347,0.0360,0.0353,0.0373,0.0452,0.0557];
const real2026Adq  = [0.04859,0.04713,0.04117,0.04002,0.03994,null,null,null,null,null,null,null];

function statusColor(r){ return r>=1 ? "#5B9B7A" : r>=0.8 ? "#E8C84A" : "#C0392B"; }
function statusLabel(r){ return r>=1 ? "✅ En meta" : r>=0.8 ? "⚡ Cerca" : "⚠ En riesgo"; }
function pctN(v,t){ return t ? Math.round((v/t)*100) : 0; }
function fmtP(n){ return n!=null ? (n*100).toFixed(1)+"%" : "—"; }
function fmtU(n){ return n!=null ? "$"+Math.round(n).toLocaleString("es-AR") : "—"; }

function Bar({ ratio }){
  const c = statusColor(ratio);
  return (
    <div style={{background:"#E0EAE6",borderRadius:8,height:10,overflow:"hidden",margin:"8px 0"}}>
      <div style={{width:`${Math.min(ratio*100,100)}%`,height:"100%",borderRadius:8,
        background:`linear-gradient(90deg,${c},${c}88)`,transition:"width 0.5s"}}/>
    </div>
  );
}

function Pill({ ratio }){
  const c = statusColor(ratio);
  return <span style={{background:c+"22",color:c,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700}}>{statusLabel(ratio)}</span>;
}

function MiniChart({ real, forecast, meta, title }){
  const W=500, H=110, pL=8, pB=22, pT=8, pR=8;
  const iW=W-pL-pR, iH=H-pT-pB;
  const all=[...real.filter(Boolean),...forecast,...(meta||[]).filter(Boolean)];
  const mx=Math.max(...all)*1.12;
  const xp=i=>pL+(i/11)*iW;
  const yp=v=>pT+iH-(v/mx)*iH;
  const path=arr=>{const pts=arr.map((v,i)=>v!=null?`${xp(i)},${yp(v)}`:null).filter(Boolean);return pts.length?"M"+pts.join("L"):"";};
  return (
    <div>
      <div style={{fontSize:11,fontWeight:700,color:AA.grisPlomo,marginBottom:4}}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
        {[0,.5,1].map(t=><line key={t} x1={pL} x2={W-pR} y1={pT+iH*(1-t)} y2={pT+iH*(1-t)} stroke="#E8EDEB" strokeWidth="1"/>)}
        {meta&&<path d={path(meta)} fill="none" stroke={AA.amarillo} strokeWidth="1.5" strokeDasharray="5,3"/>}
        <path d={path(forecast)} fill="none" stroke={AA.verdeClaro} strokeWidth="1.5" strokeDasharray="3,3"/>
        <path d={path(real)} fill="none" stroke={AA.petroleo} strokeWidth="2.5"/>
        {real.map((v,i)=>v!=null&&<circle key={i} cx={xp(i)} cy={yp(v)} r="3.5" fill={statusColor(v/(meta?meta[i]:forecast[i]))}/>)}
        {MESES.map((m,i)=><text key={i} x={xp(i)} y={H-5} textAnchor="middle" fontSize="9" fill={AA.grisClaro}>{m}</text>)}
      </svg>
      <div style={{display:"flex",gap:12,marginTop:4,fontSize:10,color:AA.grisClaro}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2.5,background:AA.petroleo}}/> Real</span>
        {meta&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,borderTop:`2px dashed ${AA.amarillo}`}}/> Meta</span>}
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,borderTop:`2px dashed ${AA.verdeClaro}`}}/> Forecast</span>
      </div>
    </div>
  );
}

const tS={width:"100%",borderCollapse:"collapse",fontSize:12};
const thR={background:"#2E5C4F",color:"#fff"};
const th={padding:"9px 12px",textAlign:"left",fontWeight:700,fontSize:11,letterSpacing:0.5};
const td={padding:"8px 12px",borderBottom:"1px solid #E8EDEB"};

function ObjPanel({ obj, chart, table }){
  const c=statusColor(obj.ratio);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Info card */}
        <div style={{background:AA.blanco,borderRadius:14,padding:"20px 22px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
          <span style={{fontSize:10,color:AA.grisClaro,textTransform:"uppercase",letterSpacing:2}}>{obj.cod}</span>
          <div style={{fontSize:15,fontWeight:800,color:AA.texto,margin:"6px 0 8px",lineHeight:1.35}}>{obj.titulo}</div>
          <div style={{fontSize:12,color:AA.grisPlomo,lineHeight:1.6}}>{obj.detalle}</div>
          <Bar ratio={obj.ratio}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:AA.grisClaro}}>
            <span>0%</span>
            <span style={{fontWeight:700,color:c}}>{pctN(obj.ratio,1)}% alcanzado</span>
            <span>100%</span>
          </div>
        </div>
        {/* KPI stats */}
        <div style={{background:AA.blanco,borderRadius:14,padding:"18px 22px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
            {obj.kpis.map((k,i)=>(
              <div key={i}>
                <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                <div style={{fontSize:11,fontWeight:600,color:AA.texto,marginTop:2}}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Chart */}
        <div style={{background:AA.blanco,borderRadius:14,padding:"18px 22px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
          {chart}
        </div>
      </div>
      {/* Table */}
      <div style={{background:AA.blanco,borderRadius:14,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #E8EDEB",fontWeight:700,fontSize:13,color:AA.petroleo}}>Detalle mensual</div>
        <div style={{overflow:"auto",maxHeight:460}}>{table}</div>
      </div>
    </div>
  );
}

export default function App(){
  const [tab, setTab]=useState(0);

  const lastR1=obj1Real.reduce((a,v,i)=>v!=null?i:a,-1);
  const ratio1=obj1Real[lastR1]/0.38;
  const ratio2=real2026USD/meta2026USD;
  const lastR3=real2026Adq.reduce((a,v,i)=>v!=null?i:a,-1);
  const ratio3=real2026Adq[lastR3]/meta2026Adq;

  const objs=[
    {
      cod:"OBJ 1", corto:"Penetración Parking", ratio:ratio1,
      titulo:"38% penetración ADA en pagos de parking",
      detalle:"Alcanzar que el 38% del total de pagos de estacionamiento se realicen a través de ADA al 31/12/2026.",
      kpis:[
        {label:"Real mayo",   value:fmtP(obj1Real[lastR1]),     color:statusColor(ratio1)},
        {label:"Meta anual",  value:"38.0%",                    color:AA.petroleo},
        {label:"Avance",      value:pctN(obj1Real[lastR1],0.38)+"%", color:statusColor(ratio1)},
      ],
    },
    {
      cod:"OBJ 2", corto:"Facturación No-Parking", ratio:ratio2,
      titulo:"+15% facturación ADA no-parking vs 2025",
      detalle:"Incrementar en 15% la facturación en categorías no parking versus 2025 al 31/12/2026, mediante nuevos servicios transaccionables.",
      kpis:[
        {label:"Real acum. (USD)", value:fmtU(real2026USD),          color:statusColor(ratio2)},
        {label:"Meta anual (USD)", value:fmtU(Math.round(meta2026USD)), color:AA.petroleo},
        {label:"Avance",          value:pctN(real2026USD,meta2026USD)+"%", color:statusColor(ratio2)},
      ],
    },
    {
      cod:"OBJ 3", corto:"Adquisición ADA", ratio:ratio3,
      titulo:"+25% adquisición ADA sobre pasajeros vs 2025",
      detalle:"Incrementar en 25% la tasa de adquisición de ADA sobre el total de pasajeros versus 2025, al 31/12/2026.",
      kpis:[
        {label:"Real mayo",   value:fmtP(real2026Adq[lastR3]),   color:statusColor(ratio3)},
        {label:"Meta anual",  value:fmtP(meta2026Adq),           color:AA.petroleo},
        {label:"Avance",      value:pctN(real2026Adq[lastR3],meta2026Adq)+"%", color:statusColor(ratio3)},
      ],
    },
  ];

  return (
    <div style={{fontFamily:"'Inter','Helvetica Neue',sans-serif",background:AA.grisBg,minHeight:"100vh"}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${AA.petroleo2} 0%,${AA.petroleo} 100%)`,padding:"22px 28px 18px",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <rect width="40" height="40" rx="9" fill={AA.amarillo}/>
              <text x="20" y="27" textAnchor="middle" fontSize="17" fontWeight="900" fill={AA.petroleo2}>AA</text>
            </svg>
            <div>
              <div style={{fontSize:10,opacity:0.65,letterSpacing:2.5,textTransform:"uppercase"}}>Aeropuertos Argentina</div>
              <div style={{fontSize:21,fontWeight:800,letterSpacing:-0.3}}>Tablero de Objetivos 2026</div>
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:11,opacity:0.75}}>
            <div>Datos hasta mayo 2026</div>
            <div style={{marginTop:4,background:"rgba(255,255,255,0.14)",borderRadius:20,padding:"3px 14px",display:"inline-block",fontWeight:600}}>5/12 meses</div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {objs.map((o,i)=>(
            <div key={i} onClick={()=>setTab(i)} style={{background:"rgba(255,255,255,0.1)",borderRadius:12,
              padding:"14px 16px",cursor:"pointer",
              border:tab===i?`2px solid ${AA.amarillo}`:"2px solid transparent",transition:"all 0.2s"}}>
              <div style={{fontSize:9,opacity:0.65,textTransform:"uppercase",letterSpacing:2}}>{o.cod}</div>
              <div style={{fontSize:12,fontWeight:700,marginTop:2,lineHeight:1.35}}>{o.corto}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <Pill ratio={o.ratio}/>
                <span style={{fontSize:22,fontWeight:900}}>{pctN(o.ratio,1)}%</span>
              </div>
              <div style={{background:"rgba(255,255,255,0.18)",borderRadius:4,height:4,marginTop:8}}>
                <div style={{width:`${Math.min(o.ratio*100,100)}%`,background:statusColor(o.ratio),height:"100%",borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"22px 28px"}}>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {objs.map((o,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{border:"none",borderRadius:20,padding:"7px 20px",
              fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.2s",
              background:tab===i?AA.petroleo:AA.blanco,
              color:tab===i?"#fff":AA.grisPlomo,
              boxShadow:tab===i?`0 2px 10px ${AA.petroleo}44`:"0 1px 4px rgba(0,0,0,0.08)"}}>
              {o.cod}
            </button>
          ))}
        </div>

        {tab===0 && (
          <ObjPanel obj={objs[0]}
            chart={<MiniChart real={obj1Real} forecast={obj1Forecast} meta={Array(12).fill(0.38)} title="Penetración ADA en Parking (%)"/>}
            table={
              <table style={tS}><thead><tr style={thR}>
                <th style={th}>Mes</th><th style={th}>Real</th><th style={th}>Forecast</th><th style={th}>Estado</th>
              </tr></thead><tbody>
                {MESES.map((m,i)=>{const r=obj1Real[i];const rt=r!=null?r/0.38:null;return(
                  <tr key={i} style={{background:i%2===0?AA.grisBg:AA.blanco}}>
                    <td style={td}>{m}</td>
                    <td style={{...td,fontWeight:700,color:rt?statusColor(rt):AA.grisClaro}}>{fmtP(r)}</td>
                    <td style={{...td,color:AA.grisClaro}}>{fmtP(obj1Forecast[i])}</td>
                    <td style={td}>{rt?<Pill ratio={rt}/>:<span style={{color:AA.grisClaro,fontSize:11}}>—</span>}</td>
                  </tr>);})}
              </tbody></table>
            }
          />
        )}

        {tab===1 && (
          <ObjPanel obj={objs[1]}
            chart={<MiniChart real={real2026Mensual} forecast={meta2026Mensual} meta={meta2026Mensual} title="Facturación No-Parking (USD mensual)"/>}
            table={
              <table style={tS}><thead><tr style={thR}>
                <th style={th}>Mes</th><th style={th}>Base 2025</th><th style={th}>Meta 2026</th><th style={th}>Real 2026</th><th style={th}>Estado</th>
              </tr></thead><tbody>
                {MESES.map((m,i)=>{const r=real2026Mensual[i];const mt=meta2026Mensual[i];const rt=r!=null?r/mt:null;return(
                  <tr key={i} style={{background:i%2===0?AA.grisBg:AA.blanco}}>
                    <td style={td}>{m}</td>
                    <td style={td}>{fmtU(base2025Mensual[i])}</td>
                    <td style={{...td,color:AA.petroleo,fontWeight:600}}>{fmtU(mt)}</td>
                    <td style={{...td,fontWeight:700,color:rt?statusColor(rt):AA.grisClaro}}>{fmtU(r)}</td>
                    <td style={td}>{rt?<Pill ratio={rt}/>:<span style={{color:AA.grisClaro,fontSize:11}}>—</span>}</td>
                  </tr>);})}
              </tbody></table>
            }
          />
        )}

        {tab===2 && (
          <ObjPanel obj={objs[2]}
            chart={<MiniChart real={real2026Adq} forecast={Array(12).fill(meta2026Adq)} meta={Array(12).fill(meta2026Adq)} title="Adquisición ADA / Pasajeros (%)"/>}
            table={
              <table style={tS}><thead><tr style={thR}>
                <th style={th}>Mes</th><th style={th}>Base 2025</th><th style={th}>Meta 2026</th><th style={th}>Real 2026</th><th style={th}>Estado</th>
              </tr></thead><tbody>
                {MESES.map((m,i)=>{const r=real2026Adq[i];const mt=base2025AAdqM[i]*1.25;const rt=r!=null?r/mt:null;return(
                  <tr key={i} style={{background:i%2===0?AA.grisBg:AA.blanco}}>
                    <td style={td}>{m}</td>
                    <td style={td}>{fmtP(base2025AAdqM[i])}</td>
                    <td style={{...td,color:AA.petroleo,fontWeight:600}}>{fmtP(mt)}</td>
                    <td style={{...td,fontWeight:700,color:rt?statusColor(rt):AA.grisClaro}}>{fmtP(r)}</td>
                    <td style={td}>{rt?<Pill ratio={rt}/>:<span style={{color:AA.grisClaro,fontSize:11}}>—</span>}</td>
                  </tr>);})}
              </tbody></table>
            }
          />
        )}
      </div>
    </div>
  );
}
