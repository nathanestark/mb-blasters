import React, {
  ChangeEvent,
  FC,
  useCallback,
  useMemo,
  useState,
  useEffect,
  SetStateAction
} from "react";
import cx from "classnames";

import { ShipConfiguration, ShipType } from "@shared/game/ship";
import { SpecialType } from "@shared/game/specials";

import useGame from "../useGame";
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
import LockIcon from "@web/svgs/lock";

import styles from "./styles.module.scss";
import Card from "@web/components/Card";

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

const MAX_TOTAL = 250;

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

type Sliders = "thrust" | "maxSpeed" | "maxRotate" | "bulletSpeed" | "specialPower";

interface Props {
  className?: string;
}

const ShipConfig: FC<Props> = ({ className }) => {
  const { getGame } = useGame();

  const shipConfig: ShipConfiguration = useMemo(() => {
    const game = getGame();
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
  }, [getGame]);

  const [ship, setShip] = useState<ShipType>(shipConfig.type);
  const [special, setSpecial] = useState<SpecialType>(shipConfig.special);

  const [locks, setLocks] = useState<Array<Sliders>>([]);

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

  const normalizedValues = useCallback(
    (lock: Sliders, newValue: number) => {
      const values: Array<{
        name: Sliders;
        val: number;
        set: React.Dispatch<SetStateAction<number>>;
      }> = [
        {
          name: "thrust" as Sliders,
          val: thrust,
          set: setThrust
        },
        {
          name: "maxSpeed" as Sliders,
          val: maxSpeed,
          set: setMaxSpeed
        },
        {
          name: "maxRotate" as Sliders,
          val: maxRotate,
          set: setMaxRotate
        },
        {
          name: "bulletSpeed" as Sliders,
          val: bulletSpeed,
          set: setBulletSpeed
        },
        {
          name: "specialPower" as Sliders,
          val: specialPower,
          set: setSpecialPower
        }
      ].map((value) => (value.name == lock ? { ...value, val: newValue } : value));

      const localLocks = [...locks, lock];

      let left = MAX_TOTAL - values.reduce((sum, val) => sum + val.val, 0);
      while (Math.abs(left) > 1e-6) {
        const valLeft = values.filter(
          (value) =>
            !localLocks.includes(value.name) &&
            ((left > 0 && value.val < 100) || (left < 0 && value.val > 0))
        );

        if (valLeft.length <= 0) {
          // Reverse the change
          const value = values.find((value) => value.name == lock);
          if (!value) throw "Not found?";
          value.val += left;
          break;
        }

        const each = left / valLeft.length;

        valLeft.forEach((value) => (value.val += each));
        left = MAX_TOTAL - values.reduce((sum, val) => sum + val.val, 0);
      }

      values.forEach((value) => value.set(value.val));
    },
    [locks, thrust, maxSpeed, maxRotate, bulletSpeed, specialPower]
  );

  const handleThrustChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.currentTarget.valueAsNumber;
      normalizedValues("thrust", newValue);
    },
    [normalizedValues]
  );

  const handleMaxSpeedChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.currentTarget.valueAsNumber;
      normalizedValues("maxSpeed", newValue);
    },
    [normalizedValues]
  );

  const handleBulletSpeedChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.currentTarget.valueAsNumber;
      normalizedValues("bulletSpeed", newValue);
    },
    [normalizedValues]
  );

  const handleMaxRotateChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.currentTarget.valueAsNumber;
      normalizedValues("maxRotate", newValue);
    },
    [normalizedValues]
  );

  const handleSpecialPowerChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.currentTarget.valueAsNumber;
      normalizedValues("specialPower", newValue);
    },
    [normalizedValues]
  );

  const handleLock = useCallback(
    (lock: Sliders) => (e: ChangeEvent<HTMLInputElement>) => {
      setLocks((prev) => {
        if (e.target.checked) return [...prev, lock];
        return prev.filter((l) => l != lock);
      });
    },
    []
  );

  const handleShipTypeClicked = useCallback(() => {
    setShip((prev) => SHIPS[prev]);
  }, []);

  const handleSpecialTypeClicked = useCallback(() => {
    setSpecial((prev) => SPECIALS[prev]);
  }, []);

  useEffect(() => {
    const game = getGame();
    if (game) {
      game.shipConfiguration = {
        ...game.shipConfiguration,
        type: ship,
        special: special,
        maxThrust: THRUST_MIN + (thrust / 100) * (THRUST_MAX - THRUST_MIN),
        maxSpeed: MAX_SPEED_MIN + (maxSpeed / 100) * (MAX_SPEED_MAX - MAX_SPEED_MIN),
        bulletSpeed: BULLET_SPEED_MIN + (bulletSpeed / 100) * (BULLET_SPEED_MAX - BULLET_SPEED_MIN),
        maxRotate: MAX_ROTATE_MIN + (maxRotate / 100) * (MAX_ROTATE_MAX - MAX_ROTATE_MIN),
        specialPower:
          SPECIAL_POWER_MIN + (specialPower / 100) * (SPECIAL_POWER_MAX - SPECIAL_POWER_MIN)
      };
    }
  }, [getGame, special, ship, thrust, maxRotate, maxSpeed, bulletSpeed, specialPower]);

  /*
    type: ShipType;
    special: SpecialType;
    bulletSpeed: number;
    maxThrust: number;
    maxRotate: number;
    maxSpeed: number;
    specialPower: number;
  */

  const thrustLocked = useMemo(() => locks.includes("thrust"), [locks]);
  const maxSpeedLocked = useMemo(() => locks.includes("maxSpeed"), [locks]);
  const maxRotateLocked = useMemo(() => locks.includes("maxRotate"), [locks]);
  const bulletSpeedLocked = useMemo(() => locks.includes("bulletSpeed"), [locks]);
  const specialPowerLocked = useMemo(() => locks.includes("specialPower"), [locks]);

  return (
    <Card className={cx(styles.shipConfig, className)}>
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
          <label className={styles.label}>{"Thrust"}</label>
          <input
            className={styles.slider}
            type="range"
            min="0"
            max="100"
            step="1"
            value={thrust}
            onChange={handleThrustChanged}
          />
          <label className={cx(styles.lock, { [styles.locked]: thrustLocked })}>
            <LockIcon />
            <input type="checkbox" checked={thrustLocked} onChange={handleLock("thrust")} />
          </label>
        </li>
        <li>
          <label className={styles.label}>{"Max Speed"}</label>
          <input
            className={styles.slider}
            type="range"
            min="0"
            max="100"
            step="1"
            value={maxSpeed}
            onChange={handleMaxSpeedChanged}
          />
          <label className={cx(styles.lock, { [styles.locked]: maxSpeedLocked })}>
            <LockIcon />
            <input type="checkbox" checked={maxSpeedLocked} onChange={handleLock("maxSpeed")} />
          </label>
        </li>
        <li>
          <label className={styles.label}>{"Rotation Speed"}</label>
          <input
            className={styles.slider}
            type="range"
            min="0"
            max="100"
            step="1"
            value={maxRotate}
            onChange={handleMaxRotateChanged}
          />
          <label className={cx(styles.lock, { [styles.locked]: maxRotateLocked })}>
            <LockIcon />
            <input type="checkbox" checked={maxRotateLocked} onChange={handleLock("maxRotate")} />
          </label>
        </li>
        <li>
          <label className={styles.label}>{"Bullet Speed"}</label>
          <input
            className={styles.slider}
            type="range"
            min="0"
            max="100"
            step="1"
            value={bulletSpeed}
            onChange={handleBulletSpeedChanged}
          />
          <label className={cx(styles.lock, { [styles.locked]: bulletSpeedLocked })}>
            <LockIcon />
            <input
              type="checkbox"
              checked={bulletSpeedLocked}
              onChange={handleLock("bulletSpeed")}
            />
          </label>
        </li>
        <li>
          <label className={styles.label}>{"Special"}</label>
          <input
            className={styles.slider}
            type="range"
            min="0"
            max="100"
            step="1"
            value={specialPower}
            onChange={handleSpecialPowerChanged}
          />
          <label className={cx(styles.lock, { [styles.locked]: specialPowerLocked })}>
            <LockIcon />
            <input
              type="checkbox"
              checked={specialPowerLocked}
              onChange={handleLock("specialPower")}
            />
          </label>
        </li>
      </ul>
    </Card>
  );
};

export default ShipConfig;
