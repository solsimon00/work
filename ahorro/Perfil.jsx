import { useEffect, useState } from "react";
import { MEDIOS, RUBROS } from "./motor.js";
import { pushSoportado, esIOSSinInstalar, activarPush, desactivarPush } from "./push.js";

function Alertas({ cuenta }) {
  const { user, perfil, setPerfil, nube } = cuenta;
  const [estado, setEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (!pushSoportado()) return <p className="nota">Este navegador no permite notificaciones.</p>;
  if (esIOSSinInstalar()) {
    return <p className="nota">En iPhone, primero agregá la app a la pantalla de inicio: tocá Compartir y después "Agregar a inicio". Abrila desde ahí y activá las alertas.</p>;
  }
  if (!nube) return <p className="nota">Las alertas se activan cuando la app esté conectada a Firebase.</p>;
  if (!user) return <p className="nota">Entrá con Google o con tu mail para recibir alertas.</p>;

  async function cambiar(on) {
    setOcupado(true); setEstado("");
    try {
      if (on) await activarPush(user); else await desactivarPush(user);
      setPerfil({ alertas: on });
      setEstado(on ? "Listo: te vamos a avisar a las 8:45 los días que tengas descuentos." : "Alertas desactivadas en este dispositivo.");
    } catch (e) { setEstado(e.message); }
    setOcupado(false);
  }

  return (
    <>
      <label className="switch">
        <input type="checkbox" checked={perfil.alertas} disabled={ocupado} onChange={e => cambiar(e.target.checked)} />
        <span>Avisarme cada mañana qué descuentos tengo ese día</span>
      </label>
      {estado && <p className="nota">{estado}</p>}
    </>
  );
}

function Ingreso({ cuenta }) {
  const { user, loginGoogle, loginMail, logout, error, nube } = cuenta;
  const [mail, setMail] = useState("");
  const [enviado, setEnviado] = useState("");
  const [fallo, setFallo] = useState("");

  if (!nube) return <p className="nota">Tu perfil se guarda en este dispositivo.</p>;
  if (user) {
    return (
      <p className="nota">
        Conectada como <b>{user.email}</b> · <a href="#perfil" onClick={e => { e.preventDefault(); logout(); }}>Cerrar sesión</a>
      </p>
    );
  }

  async function enviar(e) {
    e.preventDefault(); setFallo("");
    try { await loginMail(mail.trim()); setEnviado(mail.trim()); }
    catch { setFallo("No se pudo mandar el mail. Revisá la dirección."); }
  }

  return (
    <>
      <p className="nota">Entrá para guardar tu perfil y recibir alertas en todos tus dispositivos.</p>
      <button className="primario ancho" onClick={loginGoogle}>Entrar con Google</button>
      {enviado ? (
        <p className="nota">Te mandamos un link a <b>{enviado}</b>. Abrilo desde este dispositivo para entrar (mirá también en spam).</p>
      ) : (
        <form className="login-mail" onSubmit={enviar}>
          <input type="email" required placeholder="o con tu mail: vos@mail.com" value={mail} onChange={e => setMail(e.target.value)} aria-label="Tu mail" />
          <button type="submit" className="secundario">Mandame el link</button>
        </form>
      )}
      {(fallo || error) && <p className="nota aviso">{fallo || error}</p>}
    </>
  );
}

export default function Perfil({ cuenta, irA }) {
  const { perfil, setPerfil } = cuenta;
  const emisores = [...new Set(MEDIOS.map(m => m.emisor))];
  const [instalar, setInstalar] = useState(null);

  useEffect(() => {
    const h = e => { e.preventDefault(); setInstalar(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const toggle = (campo, id) => setPerfil(p => ({
    [campo]: p[campo].includes(id) ? p[campo].filter(x => x !== id) : [...p[campo], id],
  }));

  return (
    <>
      <section className="bloque">
        <h2>Tu cuenta</h2>
        <Ingreso cuenta={cuenta} />
      </section>

      <section className="bloque">
        <h2>Tus tarjetas y billeteras</h2>
        <p className="nota">Tildá las que tenés. La app solo te va a mostrar descuentos que podés usar.</p>
        {emisores.map(e => (
          <fieldset key={e} className="grupo">
            <legend>{e}</legend>
            {MEDIOS.filter(m => m.emisor === e).map(m => (
              <label key={m.id} className="check">
                <input type="checkbox" checked={perfil.medios.includes(m.id)} onChange={() => toggle("medios", m.id)} />
                <span>{m.nombre}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <p className="nota">¿Falta tu banco o tu tipo de cuenta? Avisanos y lo sumamos.</p>
      </section>

      <section className="bloque">
        <h2>¿En qué gastás más?</h2>
        <p className="nota">Esos rubros aparecen primero y son los que te avisamos.</p>
        <div className="chips">
          {RUBROS.filter(r => r.id !== "general").map(r => (
            <button key={r.id} className={perfil.rubros.includes(r.id) ? "on" : ""} onClick={() => toggle("rubros", r.id)}>{r.nombre}</button>
          ))}
        </div>
      </section>

      <section className="bloque">
        <h2>Alertas</h2>
        <Alertas cuenta={cuenta} />
        {instalar && <button className="secundario" onClick={() => instalar.prompt()}>Instalar la app en este dispositivo</button>}
      </section>

      {perfil.medios.length > 0 && <button className="primario ancho" onClick={() => irA("hoy")}>Ver mis descuentos de hoy</button>}
    </>
  );
}
