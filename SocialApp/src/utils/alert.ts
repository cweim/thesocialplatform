export const showAlert = (title: string, message: string) => {
  if (typeof window !== 'undefined') {
    // Web platform
    window.alert(`${title}\n\n${message}`);
  } else {
    // Mobile platform
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};
