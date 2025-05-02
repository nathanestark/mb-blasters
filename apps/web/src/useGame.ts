import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import Game from "./game";

export interface IGameContext {
  game: Game | null;
}

export const GameContext = createContext<IGameContext>({ game: null });

const useGame = (
  updateTime: number = 1000
): {
  getGame: () => Game | null;
} => {
  const [updateFromGame, setUpdateFromGame] = useState(0);
  const context = useContext<IGameContext>(GameContext);

  useEffect(() => {
    const to = setInterval(() => setUpdateFromGame((prev) => prev + 1), updateTime);
    return () => clearInterval(to);
  }, [updateTime]);

  const getGame = useCallback(() => {
    return context.game;
  }, [context, updateFromGame]);

  return {
    getGame
  };
};

export default useGame;
