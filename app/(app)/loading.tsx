// Affiché immédiatement au clic sur un lien, pendant que la page suivante se prépare côté serveur.
// Le menu reste en place : seule la zone de contenu montre ce squelette.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="topbar">
        <div className="top-left">
          <div>
            <div className="skel" style={{ width: 220, height: 22 }} />
            <div className="skel" style={{ width: 300, height: 12, marginTop: 8 }} />
          </div>
        </div>
      </header>
      <div className="content">
        <p className="helper" style={{ marginBottom: 16 }}><span className="spinner" /> Chargement…</p>
        <div className="grid cols-3">
          <div className="card"><div className="skel" style={{ height: 56 }} /></div>
          <div className="card"><div className="skel" style={{ height: 56 }} /></div>
          <div className="card"><div className="skel" style={{ height: 56 }} /></div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="skel" style={{ height: 14, width: "40%" }} />
          <div className="skel" style={{ height: 14, marginTop: 14 }} />
          <div className="skel" style={{ height: 14, marginTop: 10 }} />
          <div className="skel" style={{ height: 14, marginTop: 10, width: "85%" }} />
          <div className="skel" style={{ height: 14, marginTop: 10, width: "70%" }} />
        </div>
      </div>
    </div>
  );
}
