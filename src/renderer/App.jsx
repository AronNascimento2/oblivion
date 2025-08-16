import React, { useEffect, useState } from "react";
import GameList from "./components/GameList";
import AOS from "aos";
import "aos/dist/aos.css"; // estilos do AOS
import gargantua from "../assets/gargantua.png";
import gargantuaText from "../assets/oblivion-header.png";

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      if (!window.electronAPI) {
        console.warn("Electron API não disponível (rode dentro do Electron!)");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await window.electronAPI.scanGames();
        if (res.ok) {
          setGames(res.games);
        } else {
          setError(res.error || "Erro desconhecido");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  return (
    <div className="app">
      <header
        className="header"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            background: "#fff",
            width: "150px",
            height: "100px",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <img
            src={gargantuaText}
            alt="gargantua"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "fill",
              display: "block",
            }}
          />
        </div>

        {/* Botão no canto direito */}
        <button
          className="re-scan"
          onClick={() => location.reload()}
          style={{
            position: "absolute",
            right: "40px",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Atualizar lista
        </button>
      </header>

      <main className="main">
        {loading && (
          <div className="loader">
            <p className="text-loader">Procurando jogos...</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {!loading && <GameList games={games} />}
      </main>
    </div>
  );
}
