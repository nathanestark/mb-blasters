import React, { FC, InputHTMLAttributes } from "react";
import cx from "classnames";

import styles from "./styles.module.scss";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input: FC<Props> = ({ className, ...props }) => {
  return <input className={cx(styles.input, className)} {...props} />;
};

export default Input;
