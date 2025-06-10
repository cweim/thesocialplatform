import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  Platform,
} from "react-native";

type ModalType = "info" | "error";

interface ModalProps {
  visible: boolean;
  title: string;
  message: string;
  groupId?: string;
  type?: ModalType;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  message,
  groupId,
  type = "info",
  onClose,
}) => {
  return (
    <RNModal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          {groupId && (
            <View style={styles.groupIdContainer}>
              <Text style={styles.groupIdLabel}>Group Code:</Text>
              <Text style={styles.groupId}>{groupId}</Text>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                type === "error"
                  ? styles.modalButtonError
                  : styles.modalButtonConfirm,
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#333333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 16,
    lineHeight: 24,
  },
  groupIdContainer: {
    backgroundColor: "#333333",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  groupIdLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  groupId: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  modalButtonConfirm: {
    backgroundColor: "#dc3545",
  },
  modalButtonError: {
    backgroundColor: "#dc3545",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
