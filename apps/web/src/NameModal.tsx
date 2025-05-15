import React, { FC, useState, useCallback } from "react";
import { ConfirmationModal } from "./components/Modal";
import Input from "./components/Input";

import styles from "./NameModal.module.scss";

interface Props {
  onClose: (name: string) => void;
}

const NameModal: FC<Props> = ({ onClose }) => {
  const [name, setName] = useState("Player 1");

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleNameFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  const handleSetName = useCallback(() => {
    if (name) {
      onClose(name);
    }
  }, [name, onClose]);

  return (
    <ConfirmationModal
      className={styles.nameModal}
      title="Enter your name"
      buttons={[{ text: "Continue", type: "submit" }]}
      onSubmit={handleSetName}>
      <div className={styles.content}>
        <Input
          className={styles.nameInput}
          value={name}
          onChange={handleNameChange}
          onFocus={handleNameFocus}
        />
      </div>
    </ConfirmationModal>
  );
};

export default NameModal;
