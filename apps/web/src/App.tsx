import React, { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";

import Game from "@web/game/index";
import Player, { SerializedPlayer } from "@web/game/player";

import { GameContext } from "./useGame";

import GameViewer from "./GameViewer";
import PlayerList from "./PlayerList";
import ShipConfig from "./ShipConfig";

import styles from "./App.module.scss";

function App() {
  const [game, setGame] = useState<Game | null>(null);

  // Initialize our game.
  useEffect(() => {
    console.log("Connecting");

    const socket = io({ path: "/api/v1/stream" });

    const game = new Game(socket);
    (async () => {
      await game.load();
      setGame(game);
    })();
  }, []);

  useEffect(() => {
    if (game && !game._running && game.primaryCamera) {
      game.connect();
      game.start();
    }
  }, [game]);

  return (
    <GameContext.Provider value={{ game: game }}>
      <div className={styles.app}>
        <GameViewer />
        <PlayerList />
        <ShipConfig className={styles.shipConfig} />
      </div>
    </GameContext.Provider>
  );
}

export default App;
