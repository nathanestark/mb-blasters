import React, { FC, useState, useRef, useCallback, useEffect, MouseEventHandler } from "react";

import useGame from "./useGame";
import Player from "@web/game/player";

import styles from "./App.module.scss";

const GameViewer: FC = () => {
  const { game } = useGame();
  const [isCanvasValid, setIsCanvasValid] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handelCanvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!canvas || !game) return;

      canvasRef.current = canvas;
      setIsCanvasValid(!canvas);
    },
    [game]
  );

  useEffect(() => {
    if (!canvasRef.current || !game) return;

    game.addCamera(canvasRef.current);
    game.registerInput(canvasRef.current);
  }, [game, isCanvasValid]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  return <canvas ref={handelCanvasRef} tabIndex={1} onContextMenu={handleContextMenu} />;
};

export default GameViewer;
