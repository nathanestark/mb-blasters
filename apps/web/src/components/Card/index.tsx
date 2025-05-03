import React, { FC, PropsWithChildren } from "react";
import cx from "classnames";

import styles from "./styles.module.scss";

interface Props {
  className?: string;
}

const Card: FC<PropsWithChildren<Props>> = ({ className, children }) => {
  return (
    <div className={cx(styles.card, className)}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
};

export default Card;
