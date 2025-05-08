import React, { FC, PropsWithChildren, useCallback } from "react";
import cx from "classnames";

import Lightbox from "../Lightbox";
import Card from "../Card";
import Button from "../Button";

import styles from "./styles.module.scss";

interface Props {
  className?: string;
  containerClassName?: string;
  size?: "none" | "sm" | "md" | "lg";
}

const Modal: FC<PropsWithChildren<Props>> = ({
  className,
  containerClassName,
  size = "sm",
  children
}) => {
  return (
    <Lightbox className={cx(styles.modal, containerClassName)}>
      <Card
        className={cx(styles.content, className, { [styles[size]]: size != "none" })}
        type="heavy">
        {children}
      </Card>
    </Lightbox>
  );
};

export interface Button {
  text: string;
  onClick?: () => void;
  type?: "submit" | "button" | "reset";
}

interface ConfirmationProps extends Props {
  title: string;
  buttons: Array<Button>;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export const ConfirmationModal: FC<PropsWithChildren<ConfirmationProps>> = ({
  title,
  buttons,
  onSubmit,
  className,
  children,
  ...modalProps
}) => {
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (onSubmit) onSubmit(e);
    },
    [onSubmit]
  );

  return (
    <Modal {...modalProps} className={cx(styles.confirmation, className)}>
      <form className={styles.main} onSubmit={handleSubmit}>
        <header>
          <h2>{title}</h2>
        </header>
        <section>{children}</section>
        <footer>
          {buttons.map((button) => (
            <Button key={button.text} type={button.type || "button"} onClick={button.onClick}>
              {button.text}
            </Button>
          ))}
        </footer>
      </form>
    </Modal>
  );
};

export default Modal;
