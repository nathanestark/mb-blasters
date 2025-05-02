import React, { FC, useMemo } from "react";

import useGame from "./useGame";
import Player from "@web/game/player";

import styles from "./App.module.scss";

const PlayerList: FC = () => {
  const { getGame } = useGame();

  const players: Array<Player> = useMemo(() => {
    const game = getGame();
    if (!game) return [];
    return (game.players.children || []) as Array<Player>;
  }, [getGame]);

  const playerId = useMemo(() => {
    const game = getGame();
    return game?.player;
  }, [getGame]);

  return (
    <div className={styles.playersList}>
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
  );
};

export default PlayerList;
