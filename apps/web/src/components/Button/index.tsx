import React, { FC, PropsWithChildren, ButtonHTMLAttributes } from "react";
import cx from "classnames";

import styles from "./styles.module.scss";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

const Button: FC<PropsWithChildren<Props>> = ({ className, children, ...props }) => {
  return (
    <button className={cx(styles.button, className)} {...props}>
      <div className={styles.inner}>{children}</div>
    </button>
  );
};

export default Button;
