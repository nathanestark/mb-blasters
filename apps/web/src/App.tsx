import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

import Game from "@web/game/index";

import { GameContext } from "./useGame";

import GameViewer from "./GameViewer";
import PlayerList from "./PlayerList";
import ShipConfig from "./ShipConfig";

import Modal from "./components/Modal";
import NameModal from "./NameModal";

import styles from "./App.module.scss";

function App() {
  const [ready, setReady] = useState(false);
  const [nameEntered, setNameEntered] = useState(false);
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
      console.log("Game Connect/Start");
      game.connect();
      game.start();
      setReady(true);
    }
  }, [game]);

  const handleSetName = useCallback(
    (newName: string) => {
      if (!game) return;

      console.log("NEW NAME", newName);
      game?.updatePlayer({ name: newName });
      setNameEntered(true);
    },
    [game, name]
  );

  return (
    <GameContext.Provider value={{ game: game }}>
      <div className={styles.app}>
        <GameViewer />
        <PlayerList />
        <ShipConfig className={styles.shipConfig} />
        {!ready ? (
          <Modal>{"Loading..."}</Modal>
        ) : !nameEntered ? (
          <NameModal onClose={handleSetName} />
        ) : null}
      </div>
    </GameContext.Provider>
  );
}

export default App;
