import React, { FC, PropsWithChildren } from "react";
import cx from "classnames";

import styles from "./styles.module.scss";

interface Props {
  className?: string;
  type?: "heavy" | "light";
}

const Card: FC<PropsWithChildren<Props>> = ({ className, type = "light", children }) => {
  return (
    <div className={cx(styles.card, styles[type], className)}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
};

export default Card;
