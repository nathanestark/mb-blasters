import React, { ChangeEvent, FC, useCallback, useMemo, useState, useEffect } from "react";
import cx from "classnames";

import { ShipConfiguration, ShipType } from "@shared/game/ship";
import { SpecialType } from "@shared/game/specials";

import useGame from "./useGame";
import Player from "@web/game/player";

import DeltaShipIcon from "@web/svgs/deltaShip";
import SweepShipIcon from "@web/svgs/sweepShip";
import BusterShipIcon from "@web/svgs/busterShip";
import ShieldSpecialIcon from "@web/svgs/shieldSpecial";
import GravSpecialIcon from "@web/svgs/gravSpecial";
import AntiGravSpecialIcon from "@web/svgs/antiGravSpecial";
import MissleSpecialIcon from "@web/svgs/missleSpecial";
import WarpSpecialIcon from "@web/svgs/warpSpecial";
import CloakSpecialIcon from "@web/svgs/cloakSpecial";

import styles from "./ShipConfig.module.scss";

const THRUST_MIN = 500;
const THRUST_MAX = 5500;
const MAX_SPEED_MIN = 100;
const MAX_SPEED_MAX = 1100;
const BULLET_SPEED_MIN = 200;
const BULLET_SPEED_MAX = 1000;
const MAX_ROTATE_MIN = 0.02;
const MAX_ROTATE_MAX = 0.08;
const SPECIAL_POWER_MIN = 0;
const SPECIAL_POWER_MAX = 100;

const SHIPS: Record<ShipType, ShipType> = {
  deltaship: "bustership",
  bustership: "sweepship",
  sweepship: "deltaship"
};
const SPECIALS: Record<SpecialType, SpecialType> = {
  shield: "warp",
  warp: "grav",
  grav: "antigrav",
  antigrav: "missile",
  missile: "cloak",
  cloak: "shield",

  none: "shield"
};

interface Props {
  className?: string;
}

const ShipConfig: FC<Props> = ({ className }) => {
  const { game } = useGame();

  const shipConfig: ShipConfiguration = useMemo(() => {
    if (!game)
      return {
        type: "bustership",
        special: "shield",
        bulletSpeed: 600,
        maxThrust: 3000,
        maxRotate: 0.05,
        maxSpeed: 600,
        specialPower: 50
      };
    return game.shipConfiguration;
  }, [game]);

  const [ship, setShip] = useState<ShipType>(shipConfig.type);
  const [special, setSpecial] = useState<SpecialType>(shipConfig.special);

  const [thrust, setThrust] = useState(
    (100 * (shipConfig.maxThrust - THRUST_MIN)) / (THRUST_MAX - THRUST_MIN)
  );
  const [maxSpeed, setMaxSpeed] = useState(
    (100 * (shipConfig.maxSpeed - MAX_SPEED_MIN)) / (MAX_SPEED_MAX - MAX_SPEED_MIN)
  );
  const [bulletSpeed, setBulletSpeed] = useState(
    (100 * (shipConfig.bulletSpeed - BULLET_SPEED_MIN)) / (BULLET_SPEED_MAX - BULLET_SPEED_MIN)
  );
  const [maxRotate, setMaxRotate] = useState(
    (100 * (shipConfig.maxRotate - MAX_ROTATE_MIN)) / (MAX_ROTATE_MAX - MAX_ROTATE_MIN)
  );
  const [specialPower, setSpecialPower] = useState(
    (100 * (shipConfig.specialPower - SPECIAL_POWER_MIN)) / (SPECIAL_POWER_MAX - SPECIAL_POWER_MIN)
  );

  const handleThrustChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setThrust(e.currentTarget.valueAsNumber);
    },
    [game]
  );

  const handleMaxSpeedChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setMaxSpeed(e.currentTarget.valueAsNumber);
    },
    [game]
  );

  const handleBulletSpeedChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setBulletSpeed(e.currentTarget.valueAsNumber);
    },
    [game]
  );

  const handleMaxRotateChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setMaxRotate(e.currentTarget.valueAsNumber);
    },
    [game]
  );

  const handleSpecialPowerChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSpecialPower(e.currentTarget.valueAsNumber);
    },
    [game]
  );

  const handleShipTypeClicked = useCallback(() => {
    setShip((prev) => SHIPS[prev]);
  }, [game]);

  const handleSpecialTypeClicked = useCallback(() => {
    setSpecial((prev) => SPECIALS[prev]);
  }, [game]);

  useEffect(() => {
    if (game) {
      game.shipConfiguration = {
        ...game.shipConfiguration,
        type: ship,
        maxThrust: THRUST_MIN + (thrust / 100) * (THRUST_MAX - THRUST_MIN),
        maxSpeed: MAX_SPEED_MIN + (maxSpeed / 100) * (MAX_SPEED_MAX - MAX_SPEED_MIN),
        bulletSpeed: BULLET_SPEED_MIN + (bulletSpeed / 100) * (BULLET_SPEED_MAX - BULLET_SPEED_MIN),
        maxRotate: MAX_ROTATE_MIN + (maxRotate / 100) * (MAX_ROTATE_MAX - MAX_ROTATE_MIN),
        specialPower:
          SPECIAL_POWER_MIN + (specialPower / 100) * (SPECIAL_POWER_MAX - SPECIAL_POWER_MIN)
      };
    }
  }, [special, ship, thrust, maxRotate, maxSpeed, bulletSpeed, specialPower]);

  useEffect(() => {
    if (game) {
      game.shipConfiguration = {
        ...game.shipConfiguration,
        special: special
      };
    }
  }, [special]);

  /*
    type: ShipType;
    special: SpecialType;
    bulletSpeed: number;
    maxThrust: number;
    maxRotate: number;
    maxSpeed: number;
    specialPower: number;
  */

  return (
    <div className={cx(styles.shipConfig, className)}>
      <header>
        <h3>{"Ship"}</h3>
        <button onClick={handleShipTypeClicked}>
          {ship == "bustership" ? (
            <BusterShipIcon />
          ) : ship == "deltaship" ? (
            <DeltaShipIcon />
          ) : (
            <SweepShipIcon />
          )}
        </button>
        <button onClick={handleSpecialTypeClicked}>
          {special == "shield" ? (
            <ShieldSpecialIcon />
          ) : special == "antigrav" ? (
            <AntiGravSpecialIcon />
          ) : special == "grav" ? (
            <GravSpecialIcon />
          ) : special == "missile" ? (
            <MissleSpecialIcon />
          ) : special == "warp" ? (
            <WarpSpecialIcon />
          ) : special == "cloak" ? (
            <CloakSpecialIcon />
          ) : null}
        </button>
      </header>
      <ul className={styles.attributes}>
        <li>
          <label>{"Thrust"}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={thrust}
            onChange={handleThrustChanged}
          />
        </li>
        <li>
          <label>{"Max Speed"}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={maxSpeed}
            onChange={handleMaxSpeedChanged}
          />
        </li>
        <li>
          <label>{"Rotation Speed"}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={maxRotate}
            onChange={handleMaxRotateChanged}
          />
        </li>
        <li>
          <label>{"Bullet Speed"}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={bulletSpeed}
            onChange={handleBulletSpeedChanged}
          />
        </li>
        <li>
          <label>{"Special"}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={specialPower}
            onChange={handleSpecialPowerChanged}
          />
        </li>
      </ul>
    </div>
  );
};

export default ShipConfig;
