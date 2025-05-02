import React, { FC, useState, useRef, useCallback, useEffect, MouseEventHandler } from "react";

import useGame from "./useGame";
import Player from "@web/game/player";

import styles from "./App.module.scss";

const GameViewer: FC = () => {
  const { getGame } = useGame();
  const [isCanvasValid, setIsCanvasValid] = useState(false);
  const [inputRegistered, setInputRegistered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handelCanvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      const game = getGame();
      if (!canvas || !game) return;

      canvasRef.current = canvas;
      setIsCanvasValid(!canvas);
    },
    [getGame]
  );

  useEffect(() => {
    const game = getGame();
    if (!canvasRef.current || !game || inputRegistered) return;

    game.addCamera(canvasRef.current);
    game.registerInput(canvasRef.current);
    setInputRegistered(true);
  }, [getGame, isCanvasValid, inputRegistered]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  return <canvas ref={handelCanvasRef} tabIndex={1} onContextMenu={handleContextMenu} />;
};

export default GameViewer;
