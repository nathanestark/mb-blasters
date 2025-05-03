import React, { FC, PropsWithChildren } from "react";
import cx from "classnames";

import styles from "./styles.module.scss";

interface Props {
  className?: string;
}

const Lightbox: FC<PropsWithChildren<Props>> = ({ className, children }) => {
  return <div className={cx(styles.lightbox, className)}>{children}</div>;
};

export default Lightbox;
