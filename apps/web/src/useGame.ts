import { createContext, useContext, useEffect, useState, useMemo } from "react";
import Game from "./game";

export interface IGameContext {
  game: Game | null;
}

export const GameContext = createContext<IGameContext>({ game: null });

const useGame = (
  updateTime: number = 1000
): {
  game: Game | null;
} => {
  const [updateFromGame, setUpdateFromGame] = useState(0);
  const context = useContext<IGameContext>(GameContext);

  useEffect(() => {
    const to = setInterval(() => setUpdateFromGame((prev) => prev + 1), updateTime);
    return () => clearInterval(to);
  }, [updateTime]);

  const game: Game | null = useMemo(() => context.game, [context, updateFromGame]);

  return {
    game
  };
};

export default useGame;
