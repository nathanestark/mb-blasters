import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import Game from "./game";

export interface IGameContext {
  game: Game | null;
}

export const GameContext = createContext<IGameContext>({ game: null });

const useGame = (): {
  getGame: () => Game | null;
} => {
  const context = useContext<IGameContext>(GameContext);

  const getGame = useCallback(() => {
    return context.game;
  }, [context]);

  return {
    getGame
  };
};

export default useGame;
