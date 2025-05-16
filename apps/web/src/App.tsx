import React, { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

import Game from "@web/game/index";

import { GameContext } from "./useGame";

import GameViewer from "./GameViewer";
import PlayerList from "./PlayerList";
import ShipConfig from "./ShipConfig";

import Modal, { ConfirmationModal } from "./components/Modal";
import NameModal from "./NameModal";

import styles from "./App.module.scss";

function App() {
  const [ready, setReady] = useState(false);
  const [nameEntered, setNameEntered] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [disconnected, setDisconnected] = useState<boolean>(false);

  // Initialize our game.
  useEffect(() => {
    let socket: Socket | null = null;
    if (!disconnected) {
      console.log("Connecting");

      socket = io({ path: "/api/v1/stream" });

      const game = new Game(socket);
      game.once("disconnected", () => setDisconnected(true));

      (async () => {
        await game.load();
        setGame(game);
      })();
    }
    return () => {
      if (socket) {
        socket.disconnect();
        setGame(null);
      }
    };
  }, [disconnected]);

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

      game?.updatePlayer({ name: newName });
      setNameEntered(true);
    },
    [game, name]
  );

  const handleReconnectClicked = useCallback(() => {
    setReady(false);
    setNameEntered(false);
    setDisconnected(false);
  }, []);

  return (
    <GameContext.Provider value={{ game: game }}>
      <div className={styles.app}>
        {game && <GameViewer />}
        <PlayerList />
        <ShipConfig className={styles.shipConfig} />
        {!ready ? (
          <Modal>{"Loading..."}</Modal>
        ) : disconnected ? (
          <ConfirmationModal
            title={"Disconnected"}
            buttons={[{ text: "Reconnect", onClick: handleReconnectClicked }]}>
            {"You have been disconnected"}
          </ConfirmationModal>
        ) : !nameEntered ? (
          <NameModal onClose={handleSetName} />
        ) : null}
      </div>
    </GameContext.Provider>
  );
}

export default App;
