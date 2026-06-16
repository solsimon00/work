import { useState, useEffect } from "react";

// Paleta oficial — Guía Visual Aeropuertos Argentina 2024 V07
const AA = {
  verde:      "#007381",   // Verde Institucional (principal)
  verde2:     "#007a8a",   // Verde oscuro secundario
  teal:       "#00a395",   // Teal secundario
  tealClaro:  "#58bcad",   // Teal claro
  gris:       "#73787B",   // Gris Institucional (principal)
  grisOscuro: "#4a4d4f",
  grisClaro:  "#9ea2a5",
  grisBg:     "#f0f2f2",
  limon:      "#dce171",   // Amarillo/limón secundario
  limonClaro: "#eef0a8",
  verde3:     "#a7cd74",   // Verde lima
  azul:       "#3d70b8",
  blanco:     "#FFFFFF",
  texto:      "#1a1f1c",
  danger:     "#c0392b",
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Datos por defecto (se usan mientras carga la planilla o si falla la conexión).
// La planilla de Google Sheets publicada los sobreescribe en tiempo real.
const DEFAULTS = {
  obj1Forecast: [0.331,0.332,0.330,0.332,0.339,0.346,0.351,0.355,0.362,0.371,0.382,0.382],
  obj1Real:     [0.33, 0.33, 0.33, 0.30, 0.31, null,null,null,null,null,null,null],
  base2025Mensual: [15821,9142,5231,7805,5734,4832,6097,3871,3034,6724,14300,12227],
  real2026Mensual: [12478,10575,8341,5660,4068,null,null,null,null,null,null,null],
  conv2026: [221264,189445,175572,145804,133340,165115,199830,177484,166034,167130,193619,219219],
  pax2026:  [4553378,4019397,4264675,3642907,3338468,3513084,4344125,4225813,3953184,3979287,3951415,4473847],
  meta1Final: 0.38,             // se evalúa con el dato de diciembre 2026
  base2025AdqTotal: 0.036073,   // tasa total adquisición/pasajeros 2025
};

// Planilla de Google Sheets publicada como CSV — fuente de datos en vivo.
const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTvUQBCiO2CenQLa1yGGU9BlcCYEpbnxinmAyI_68geZxcEpavhy9nECHb3Vg600vTWusw4evbJlQH6/pub?output=csv";

function parseNum(s){
  if(s==null) return null;
  const t=String(s).trim();
  if(t==="") return null;
  const v=parseFloat(t.replace(/[^0-9.\-]/g,""));
  return isNaN(v) ? null : v;
}

// La planilla debe tener una fila por mes (Ene..Dic) con columnas:
// Mes, OBJ1_Forecast, OBJ1_Real, OBJ2_Base2025, OBJ2_Real2026, Conversaciones2026, Pasajeros2026
// y dos filas extra con constantes anuales: "Meta1Final" y "Base2025AdqTotal" (columna B = valor).
function parseSheet(csvText){
  const rows = csvText.trim().split(/\r?\n/).map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g,"")));
  const d = {
    obj1Forecast: [...DEFAULTS.obj1Forecast],
    obj1Real: [...DEFAULTS.obj1Real],
    base2025Mensual: [...DEFAULTS.base2025Mensual],
    real2026Mensual: [...DEFAULTS.real2026Mensual],
    conv2026: [...DEFAULTS.conv2026],
    pax2026: [...DEFAULTS.pax2026],
    meta1Final: DEFAULTS.meta1Final,
    base2025AdqTotal: DEFAULTS.base2025AdqTotal,
  };
  for(const row of rows){
    const key = row[0];
    const idx = MESES.indexOf(key);
    if(idx>=0){
      const f1=parseNum(row[1]); if(f1!=null) d.obj1Forecast[idx]=f1;
      d.obj1Real[idx]=parseNum(row[2]);
      const b2=parseNum(row[3]); if(b2!=null) d.base2025Mensual[idx]=b2;
      d.real2026Mensual[idx]=parseNum(row[4]);
      const c=parseNum(row[5]); if(c!=null) d.conv2026[idx]=c;
      const p=parseNum(row[6]); if(p!=null) d.pax2026[idx]=p;
    } else if(key==="Meta1Final"){
      const v=parseNum(row[1]); if(v!=null) d.meta1Final=v;
    } else if(key==="Base2025AdqTotal"){
      const v=parseNum(row[1]); if(v!=null) d.base2025AdqTotal=v;
    }
  }
  return d;
}

function statusColor(r){ return r>=1 ? AA.teal : r>=0.8 ? AA.limon : AA.danger; }
function statusLabel(r){ return r>=1 ? "En meta" : r>=0.8 ? "Cerca" : "En riesgo"; }
function pctN(v,t){ return t ? Math.round((v/t)*100) : 0; }
function fmtP(n){ return n!=null ? (n*100).toFixed(1)+"%" : "—"; }
function fmtU(n){ return n!=null ? "$"+Math.round(n).toLocaleString("es-AR") : "—"; }
function fmtN(n){ return n!=null ? Math.round(n).toLocaleString("es-AR") : "—"; }

function Bar({ ratio }){
  const c = statusColor(ratio);
  return (
    <div style={{background:"#d8e0e1",borderRadius:6,height:8,overflow:"hidden",margin:"10px 0"}}>
      <div style={{width:`${Math.min(ratio*100,100)}%`,height:"100%",borderRadius:6,
        background:c,transition:"width 0.5s"}}/>
    </div>
  );
}

function Pill({ ratio, text }){
  const c = statusColor(ratio);
  const isDark = c === AA.limon;
  return (
    <span style={{
      background: c,
      color: isDark ? AA.grisOscuro : "#fff",
      borderRadius: 4,
      padding: "3px 10px",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    }}>
      {text || statusLabel(ratio)}
    </span>
  );
}

function MiniChart({ real, forecast, meta, title }){
  const W=500, H=120, pL=10, pB=24, pT=10, pR=10;
  const iW=W-pL-pR, iH=H-pT-pB;
  const all=[...real.filter(Boolean),...forecast,...(meta||[]).filter(Boolean)];
  const mx=Math.max(...all)*1.12;
  const xp=i=>pL+(i/11)*iW;
  const yp=v=>pT+iH-(v/mx)*iH;
  const path=arr=>{const pts=arr.map((v,i)=>v!=null?`${xp(i)},${yp(v)}`:null).filter(Boolean);return pts.length?"M"+pts.join("L"):"";};
  return (
    <div>
      <div style={{fontSize:11,fontWeight:700,color:AA.gris,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
        {[0,.5,1].map(t=><line key={t} x1={pL} x2={W-pR} y1={pT+iH*(1-t)} y2={pT+iH*(1-t)} stroke="#dde3e3" strokeWidth="1"/>)}
        {meta&&<path d={path(meta)} fill="none" stroke={AA.limon} strokeWidth="1.5" strokeDasharray="5,3"/>}
        <path d={path(forecast)} fill="none" stroke={AA.tealClaro} strokeWidth="1.5" strokeDasharray="3,3"/>
        <path d={path(real)} fill="none" stroke={AA.verde} strokeWidth="2.5"/>
        {real.map((v,i)=>v!=null&&<circle key={i} cx={xp(i)} cy={yp(v)} r="3.5" fill={statusColor(v/(meta?meta[i]:forecast[i]))} stroke="#fff" strokeWidth="1"/>)}
        {MESES.map((m,i)=><text key={i} x={xp(i)} y={H-6} textAnchor="middle" fontSize="9" fill={AA.grisClaro}>{m}</text>)}
      </svg>
      <div style={{display:"flex",gap:14,marginTop:6,fontSize:10,color:AA.grisClaro}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2.5,background:AA.verde}}/> Real</span>
        {meta&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,borderTop:`2px dashed ${AA.limon}`}}/> Meta</span>}
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,borderTop:`2px dashed ${AA.tealClaro}`}}/> Forecast</span>
      </div>
    </div>
  );
}

const tS={width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Open Sans','Verdana',sans-serif"};
const thR={background:AA.verde,color:"#fff"};
const th={padding:"10px 14px",textAlign:"left",fontWeight:700,fontSize:11,letterSpacing:0.8,textTransform:"uppercase"};
const td={padding:"9px 14px",borderBottom:`1px solid #e2e8e8`};

function ObjPanel({ obj, chart, table }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Info card */}
        <div style={{background:AA.blanco,borderRadius:10,padding:"22px 24px",boxShadow:"0 1px 6px rgba(0,115,129,0.10)",border:`1px solid #e2e8e8`}}>
          <span style={{fontSize:10,color:AA.grisClaro,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"'Open Sans','Verdana',sans-serif"}}>{obj.cod}</span>
          <div style={{fontSize:16,fontWeight:700,color:AA.texto,margin:"8px 0 10px",lineHeight:1.35,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{obj.titulo}</div>
          <div style={{fontSize:12,color:AA.gris,lineHeight:1.7,fontFamily:"'Open Sans','Verdana',sans-serif"}}>{obj.detalle}</div>

          {obj.kind === "binary" ? (
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <div style={{flex:1,background:AA.grisBg,borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:AA.gris,textTransform:"uppercase",letterSpacing:0.5,fontFamily:"'Open Sans','Verdana',sans-serif"}}>Real más reciente</div>
                <div style={{fontSize:20,fontWeight:700,color:statusColor(obj.ratio),fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{obj.realLabel}</div>
              </div>
              <div style={{flex:1,background:AA.limonClaro,borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:AA.grisOscuro,textTransform:"uppercase",letterSpacing:0.5,fontFamily:"'Open Sans','Verdana',sans-serif"}}>Meta final (diciembre)</div>
                <div style={{fontSize:20,fontWeight:700,color:AA.grisOscuro,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{obj.metaLabel}</div>
              </div>
            </div>
          ) : (
            <>
              <Bar ratio={obj.ratio}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:AA.grisClaro,fontFamily:"'Open Sans','Verdana',sans-serif"}}>
                <span>0%</span>
                <span style={{fontWeight:700,color:statusColor(obj.ratio)}}>{pctN(obj.ratio,1)}% de avance hacia la meta anual</span>
                <span>100%</span>
              </div>
            </>
          )}
        </div>
        {/* KPI stats */}
        <div style={{background:AA.blanco,borderRadius:10,padding:"20px 24px",boxShadow:"0 1px 6px rgba(0,115,129,0.10)",border:`1px solid #e2e8e8`}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
            {obj.kpis.map((k,i)=>(
              <div key={i} style={{padding:"12px 6px",borderRadius:8,background:AA.grisBg}}>
                <div style={{fontSize:22,fontWeight:700,color:k.color,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{k.value}</div>
                <div style={{fontSize:10,fontWeight:600,color:AA.gris,marginTop:4,textTransform:"uppercase",letterSpacing:0.5,fontFamily:"'Open Sans','Verdana',sans-serif"}}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Chart */}
        <div style={{background:AA.blanco,borderRadius:10,padding:"20px 24px",boxShadow:"0 1px 6px rgba(0,115,129,0.10)",border:`1px solid #e2e8e8`}}>
          {chart}
        </div>
      </div>
      {/* Table */}
      <div style={{background:AA.blanco,borderRadius:10,boxShadow:"0 1px 6px rgba(0,115,129,0.10)",overflow:"hidden",border:`1px solid #e2e8e8`}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid #e2e8e8`,fontWeight:700,fontSize:12,color:AA.verde,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Open Sans','Verdana',sans-serif"}}>Detalle mensual</div>
        <div style={{overflow:"auto",maxHeight:460}}>{table}</div>
      </div>
    </div>
  );
}

export default function App(){
  const [tab, setTab]=useState(0);
  const [data, setData]=useState(DEFAULTS);
  const [updatedAt, setUpdatedAt]=useState(null);
  const [loading, setLoading]=useState(false);
  const [loadError, setLoadError]=useState(null);

  function loadData(){
    setLoading(true); setLoadError(null);
    fetch(DATA_URL + (DATA_URL.includes("?") ? "&" : "?") + "_=" + Date.now())
      .then(r => { if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); })
      .then(text => { setData(parseSheet(text)); setUpdatedAt(new Date()); })
      .catch(e => setLoadError("No se pudo actualizar desde Google Sheets: " + e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadData(); }, []);

  const obj1Forecast = data.obj1Forecast;
  const obj1Real = data.obj1Real;
  const base2025Mensual = data.base2025Mensual;
  const real2026Mensual = data.real2026Mensual;
  const meta2026Mensual = base2025Mensual.map(v => Math.round(v * 1.15));
  const meta1Final = data.meta1Final;
  const meta2Final = base2025Mensual.reduce((a,v)=>a+v,0) * 1.15;
  const meta3Final = data.base2025AdqTotal * 1.25;
  const conv2026 = data.conv2026;
  const pax2026 = data.pax2026;
  const paxTotal2026 = pax2026.reduce((a,v)=>a+v,0);
  const convMetaAnual = meta3Final * paxTotal2026;

  // OBJ1: objetivo binario, se cumple con el dato de diciembre (38%).
  // El seguimiento mensual solo muestra si el real viene en línea con el forecast (no aplica % de avance).
  const lastR1=obj1Real.reduce((a,v,i)=>v!=null?i:a,-1);
  const ratio1=lastR1>=0 && obj1Forecast[lastR1] ? obj1Real[lastR1]/obj1Forecast[lastR1] : 0;

  // OBJ2: acumulado de facturación de los meses transcurridos de 2026 vs meta anual total
  // (total 2025 + 15%). Avance% = acumulado / meta anual. Falta = meta anual - acumulado.
  const lastR2=real2026Mensual.reduce((a,v,i)=>v!=null?i:a,-1);
  const acum2026 = real2026Mensual.slice(0,lastR2+1).reduce((a,v)=>a+(v||0),0);
  const falta2 = Math.max(meta2Final - acum2026, 0);
  const ratio2 = meta2Final ? acum2026/meta2Final : 0;

  // OBJ3: tasa acumulada (para seguimiento/contexto) y conversaciones absolutas:
  // el % de avance se calcula como conversaciones reales acumuladas / conversaciones
  // necesarias para cumplir la meta anual (tasa meta * pasajeros totales 2026).
  // Se toma como "real" la misma cantidad de meses transcurridos que en OBJ2.
  const N_REAL_3 = lastR2+1;
  const real2026Adq = pax2026.map((p,i) => (i<N_REAL_3 && p) ? conv2026[i]/p : null);
  const convAcum3 = conv2026.slice(0,N_REAL_3).reduce((a,v)=>a+v,0);
  const convFaltan3 = Math.max(convMetaAnual - convAcum3, 0);
  const ratio3 = convMetaAnual ? convAcum3/convMetaAnual : 0;

  const objs=[
    {
      cod:"OBJ 1", corto:"Penetración Parking", ratio:ratio1, kind:"binary",
      titulo:"38% penetración ADA en pagos de parking",
      detalle:"Alcanzar que el 38% del total de pagos de estacionamiento se realicen a través de ADA al 31/12/2026. El objetivo se evalúa exclusivamente con el dato de diciembre; el seguimiento mensual muestra si el real viene en línea con el forecast.",
      realLabel: lastR1>=0 ? fmtP(obj1Real[lastR1]) + ` (${MESES[lastR1]})` : "—",
      metaLabel: fmtP(meta1Final) + " (Dic)",
      kpis:[
        {label:"Real más reciente", value:lastR1>=0?fmtP(obj1Real[lastR1]):"—", color:statusColor(ratio1)},
        {label:"Forecast del mes",  value:lastR1>=0?fmtP(obj1Forecast[lastR1]):"—", color:AA.verde},
        {label:"Meta diciembre",    value:fmtP(meta1Final),          color:AA.verde},
      ],
    },
    {
      cod:"OBJ 2", corto:"Facturación No-Parking", ratio:ratio2, kind:"cumulative",
      titulo:"+15% facturación ADA no-parking vs 2025",
      detalle:"Incrementar en 15% la facturación en categorías no parking versus el total de 2025 al 31/12/2026. Se sigue el acumulado de los meses transcurridos de 2026 contra la meta anual total.",
      kpis:[
        {label:"Acumulado 2026 (USD)",  value:fmtU(acum2026), color:AA.verde},
        {label:"Meta anual (USD)",      value:fmtU(meta2Final), color:AA.gris},
        {label:"Falta facturar (USD)",  value:fmtU(falta2), color:statusColor(ratio2)},
      ],
    },
    {
      cod:"OBJ 3", corto:"Adquisición ADA", ratio:ratio3, kind:"cumulative",
      titulo:"+25% adquisición ADA sobre pasajeros vs 2025",
      detalle:"Incrementar en 25% la tasa de adquisición de ADA (conversaciones / pasajeros) versus el total de 2025 al 31/12/2026. El % de avance se mide en conversaciones absolutas: acumulado real de conversaciones vs. conversaciones necesarias para cumplir la meta anual.",
      kpis:[
        {label:"Conversaciones acumuladas 2026",  value:fmtN(convAcum3), color:AA.verde},
        {label:"Meta anual (conversaciones)",      value:fmtN(convMetaAnual), color:AA.gris},
        {label:"Faltan conversaciones",            value:fmtN(convFaltan3), color:statusColor(ratio3)},
      ],
    },
  ];

  return (
    <div style={{fontFamily:"'Open Sans','Verdana',sans-serif",background:AA.grisBg,minHeight:"100vh"}}>

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;700&family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${AA.verde2} 0%,${AA.verde} 60%,${AA.teal} 100%)`,padding:"24px 32px 20px",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {/* Isotipo institucional */}
            <svg width="44" height="44" viewBox="0 0 44 44">
              <rect width="44" height="44" rx="8" fill={AA.limon}/>
              {/* Forma abstracta del avión / marca */}
              <polygon points="22,8 36,30 22,24 8,30" fill={AA.verde2}/>
              <polygon points="22,24 36,30 22,36" fill={AA.grisOscuro} opacity="0.4"/>
            </svg>
            <div>
              <div style={{fontSize:10,opacity:0.75,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Open Sans','Verdana',sans-serif"}}>Aeropuertos Argentina</div>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:-0.3,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>Tablero de Objetivos 2026</div>
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:11,opacity:0.8,fontFamily:"'Open Sans','Verdana',sans-serif"}}>
            <div>{lastR2>=0 ? `Datos hasta ${MESES[lastR2]} 2026` : "Sin datos cargados"}</div>
            <div style={{marginTop:5,background:"rgba(255,255,255,0.15)",borderRadius:20,padding:"4px 16px",display:"inline-block",fontWeight:600,letterSpacing:0.5}}>{lastR2+1} / 12 meses</div>
            <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
              <button onClick={loadData} disabled={loading} style={{
                background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.4)",
                borderRadius:16, padding:"4px 14px", fontSize:11, fontWeight:600, cursor:loading?"default":"pointer",
                fontFamily:"'Open Sans','Verdana',sans-serif",
              }}>{loading ? "Actualizando..." : "Actualizar datos"}</button>
            </div>
            {updatedAt && <div style={{marginTop:4,fontSize:10,opacity:0.7}}>Última actualización: {updatedAt.toLocaleTimeString("es-AR")}</div>}
            {loadError && <div style={{marginTop:4,fontSize:10,color:AA.limon,maxWidth:260}}>{loadError}</div>}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {objs.map((o,i)=>(
            <div key={i} onClick={()=>setTab(i)} style={{
              background: tab===i ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
              borderRadius:10,
              padding:"16px 18px",
              cursor:"pointer",
              borderLeft: tab===i ? `4px solid ${AA.limon}` : "4px solid transparent",
              transition:"all 0.2s",
            }}>
              <div style={{fontSize:10,opacity:0.65,textTransform:"uppercase",letterSpacing:2.5,fontFamily:"'Open Sans','Verdana',sans-serif"}}>{o.cod}</div>
              <div style={{fontSize:15,fontWeight:700,marginTop:3,lineHeight:1.35,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{o.corto}</div>

              {o.kind === "binary" ? (
                <>
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginTop:12}}>
                    <span style={{fontSize:18,fontWeight:700,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{o.realLabel}</span>
                  </div>
                  <div style={{fontSize:12,opacity:0.7,marginTop:6,fontFamily:"'Open Sans','Verdana',sans-serif"}}>Meta final: {o.metaLabel}</div>
                </>
              ) : (
                <>
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginTop:12}}>
                    <span style={{fontSize:28,fontWeight:700,fontFamily:"'Kanit','Trebuchet MS',sans-serif"}}>{pctN(o.ratio,1)}%</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.2)",borderRadius:3,height:4,marginTop:10}}>
                    <div style={{width:`${Math.min(o.ratio*100,100)}%`,background:statusColor(o.ratio),height:"100%",borderRadius:3}}/>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"24px 32px"}}>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {objs.map((o,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{
              border: tab===i ? `2px solid ${AA.verde}` : "2px solid #d6dcdc",
              borderRadius:6,
              padding:"7px 22px",
              fontWeight:700,
              fontSize:11,
              cursor:"pointer",
              transition:"all 0.2s",
              background: tab===i ? AA.verde : AA.blanco,
              color: tab===i ? "#fff" : AA.gris,
              letterSpacing:0.5,
              textTransform:"uppercase",
              fontFamily:"'Open Sans','Verdana',sans-serif",
            }}>
              {o.cod}
            </button>
          ))}
        </div>

        {tab===0 && (
          <ObjPanel obj={objs[0]}
            chart={<MiniChart real={obj1Real} forecast={obj1Forecast} meta={Array(12).fill(meta1Final)} title="Penetración ADA en Parking (%)"/>}
            table={
              <table style={tS}><thead><tr style={thR}>
                <th style={th}>Mes</th><th style={th}>Real</th><th style={th}>Forecast</th><th style={th}>Diferencia</th>
              </tr></thead><tbody>
                {MESES.map((m,i)=>{const r=obj1Real[i];const rt=r!=null?r/obj1Forecast[i]:null;const isDec=i===11;return(
                  <tr key={i} style={{background:isDec?AA.limonClaro:(i%2===0?AA.grisBg:AA.blanco)}}>
                    <td style={{...td,fontWeight:isDec?700:400}}>{m}{isDec?` — meta final ${fmtP(meta1Final)}`:""}</td>
                    <td style={{...td,fontWeight:700,color:rt?statusColor(rt):AA.grisClaro}}>{fmtP(r)}</td>
                    <td style={{...td,color:AA.grisClaro}}>{fmtP(obj1Forecast[i])}</td>
                    <td style={{...td,color:AA.grisClaro}}>{rt!=null?(((rt-1)*100).toFixed(1)+"%"):"—"}</td>
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
                <th style={th}>Mes</th><th style={th}>Real mensual</th><th style={th}>Acumulado 2026</th><th style={th}>% de meta anual</th><th style={th}>Falta (USD)</th>
              </tr></thead><tbody>
                {(() => {
                  let run2026=0;
                  return MESES.map((m,i)=>{
                    const r=real2026Mensual[i];
                    if(r!=null) run2026+=r;
                    const avancePct = r!=null ? run2026/meta2Final : null;
                    const falta = r!=null ? Math.max(meta2Final-run2026,0) : null;
                    return (
                      <tr key={i} style={{background:i%2===0?AA.grisBg:AA.blanco}}>
                        <td style={td}>{m}</td>
                        <td style={{...td,fontWeight:700,color:r!=null?AA.texto:AA.grisClaro}}>{fmtU(r)}</td>
                        <td style={{...td,color:r!=null?AA.verde:AA.grisClaro,fontWeight:600}}>{r!=null?fmtU(run2026):"—"}</td>
                        <td style={{...td,fontWeight:700,color:avancePct?statusColor(avancePct):AA.grisClaro}}>{avancePct!=null?((avancePct*100).toFixed(1)+"%"):"—"}</td>
                        <td style={{...td,color:AA.grisClaro}}>{falta!=null?fmtU(falta):"—"}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody></table>
            }
          />
        )}

        {tab===2 && (
          <ObjPanel obj={objs[2]}
            chart={<MiniChart real={real2026Adq} forecast={Array(12).fill(meta3Final)} meta={Array(12).fill(meta3Final)} title="Adquisición ADA / Pasajeros (%)"/>}
            table={
              <table style={tS}><thead><tr style={thR}>
                <th style={th}>Mes</th><th style={th}>Conversaciones</th><th style={th}>Pasajeros</th><th style={th}>Adquisición %</th><th style={th}>Conv. acumuladas (real)</th><th style={th}>% avance</th><th style={th}>Faltan conv.</th>
              </tr></thead><tbody>
                {(() => {
                  let runConv=0;
                  return MESES.map((m,i)=>{
                    const esReal = i < N_REAL_3;
                    const conv = conv2026[i];
                    const pax = pax2026[i];
                    const adq = real2026Adq[i]!=null ? real2026Adq[i] : (pax ? conv/pax : null);
                    let acumConv = null, avancePct = null, faltan = null;
                    if(esReal){
                      runConv += conv;
                      acumConv = runConv;
                      avancePct = convMetaAnual ? acumConv/convMetaAnual : null;
                      faltan = Math.max(convMetaAnual-acumConv,0);
                    }
                    return (
                      <tr key={i} style={{background:i%2===0?AA.grisBg:AA.blanco}}>
                        <td style={td}>{m}{!esReal && <span style={{color:AA.grisClaro,fontSize:10}}> (proy.)</span>}</td>
                        <td style={{...td,fontWeight:700,color:esReal?AA.texto:AA.grisClaro}}>{fmtN(conv)}</td>
                        <td style={{...td,color:esReal?AA.texto:AA.grisClaro}}>{fmtN(pax)}</td>
                        <td style={{...td,color:esReal?AA.texto:AA.grisClaro}}>{fmtP(adq)}</td>
                        <td style={{...td,color:esReal?AA.verde:AA.grisClaro,fontWeight:600}}>{acumConv!=null?fmtN(acumConv):"—"}</td>
                        <td style={{...td,fontWeight:700,color:avancePct!=null?statusColor(avancePct):AA.grisClaro}}>{avancePct!=null?((avancePct*100).toFixed(1)+"%"):"—"}</td>
                        <td style={{...td,color:AA.grisClaro}}>{faltan!=null?fmtN(faltan):"—"}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody></table>
            }
          />
        )}
      </div>
    </div>
  );
}
