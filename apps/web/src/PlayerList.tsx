import React, { FC, useEffect, useMemo, useState } from "react";

import useGame from "./useGame";
import Player from "@web/game/player";

import Card from "./components/Card";

import styles from "./App.module.scss";

const PlayerList: FC = () => {
  const { getGame } = useGame();
  const [players, setPlayers] = useState<Array<Player>>([]);

  useEffect(() => {
    const game = getGame();
    game?.on("playerConnected", () => {
      setPlayers((game?.players?.children || []) as Array<Player>);
    });
    game?.on("playerDisconnected", () => {
      setPlayers((game?.players?.children || []) as Array<Player>);
    });
    game?.on("playerChanged", (player: Player) => {
      setPlayers((game?.players?.children || []) as Array<Player>);
    });
  }, [getGame]);

  const playerId = useMemo(() => {
    const game = getGame();
    return game?.player;
  }, [getGame]);

  return (
    <Card className={styles.playersList}>
      <div className={styles.container}>
        <h3>{"Players"}</h3>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              {player.id == playerId && <span>{" (You)"}</span>}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};

export default PlayerList;
