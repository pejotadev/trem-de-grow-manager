import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  duration?: number;
  onPress?: () => void;
  onHide?: () => void;
}

/**
 * Show a toast notification
 */
export const showToast = (
  type: ToastType,
  message: string,
  options?: ToastOptions
) => {
  Toast.show({
    type,
    text1: options?.title,
    text2: message,
    visibilityTime: options?.duration || 3000,
    onPress: options?.onPress,
    onHide: options?.onHide,
    position: 'top',
    topOffset: 50,
  });
};

/**
 * Show success toast
 */
export const showSuccess = (message: string, title?: string, onHide?: () => void) => {
  showToast('success', message, { title: title || 'Success', onHide });
};

/**
 * Show error toast
 */
export const showError = (message: string, title?: string) => {
  showToast('error', message, { title: title || 'Error', duration: 4000 });
};

/**
 * Show info toast
 */
export const showInfo = (message: string, title?: string) => {
  showToast('info', message, { title });
};

/**
 * Show warning toast
 */
export const showWarning = (message: string, title?: string) => {
  showToast('warning', message, { title: title || 'Warning', duration: 4000 });
};

/**
 * Hide current toast
 */
export const hideToast = () => {
  Toast.hide();
};



