import React, { useEffect } from "react";
import defaultThumb from "../../assets/default-thumb.png";
import steamLogo from "../../assets/steam-logo.png";
import AOS from "aos";
import "aos/dist/aos.css";

export default function GameList({ games = [] }) {
  useEffect(() => {
    AOS.init({ duration: 800, easing: "ease-in-out", once: true });
  }, []);

  const steamGames = games
    .filter((g) => g.source === "Steam" && !g.name.toLowerCase().includes("steamworks"));

  if (!steamGames.length) return <p>Nenhum jogo Steam encontrado.</p>;

  return (
    <div>
      <div className="header-steam">
        <img src={steamLogo} alt="Steam Logo" className="steam-logo" />
        <h1 className="steam-title">Steam</h1>
      </div>

      <div className="grid">
        {steamGames.map((g, i) => (
          <div key={i} className="card" data-aos="fade-up" data-aos-delay={i * 150}>
            <div className="thumbnail">
              <img
                src={g.thumb || defaultThumb}
                alt={g.name}
                style={{ width: "100%", maxHeight: "130px", borderRadius: "6px" }}
                onError={(e) => { e.currentTarget.src = defaultThumb; }}
              />
            </div>

            <div className="title">{g.name}</div>
            <div className="meta">{g.source}</div>

            <div className="actions">
              {g.exe ? (
                <button onClick={() => window.electronAPI.openGame(g)}>Jogar</button>
              ) : (
                g.install_dir && (
                  <button onClick={() => window.electronAPI.openPath?.(g.install_dir)}>
                    Abrir pasta
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
