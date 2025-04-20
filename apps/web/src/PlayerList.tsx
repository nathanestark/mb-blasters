import React, { FC, useMemo } from "react";

import useGame from "./useGame";
import Player from "@web/game/player";

import styles from "./App.module.scss";

const PlayerList: FC = () => {
  const { game } = useGame();

  const players: Array<Player> = useMemo(() => {
    if (!game) return [];
    return game.filter("player") as Array<Player>;
  }, [game]);

  return (
    <div className={styles.playersList}>
      <h3>{"Players"}</h3>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            <span>{player.name}</span>
            {player.id == game?.player && <span>{"(You)"}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;
