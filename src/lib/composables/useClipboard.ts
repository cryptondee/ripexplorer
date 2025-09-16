/**
 * Clipboard composable for reusable copy functionality
 * Centralizes clipboard operations with consistent feedback
 */

export interface ClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  showAlert?: boolean;
}

export function useClipboard() {
  /**
   * Copy text to clipboard with optional feedback
   * @param text - Text to copy
   * @param options - Configuration options
   * @returns Promise<boolean> - Success status
   */
  async function copy(text: string, options: ClipboardOptions = {}): Promise<boolean> {
    const {
      successMessage = 'Copied to clipboard!',
      errorMessage = 'Failed to copy to clipboard',
      showAlert = true
    } = options;

    try {
      await navigator.clipboard.writeText(text);
      
      if (showAlert) {
        // TODO: Replace with toast service when available
        alert(successMessage);
      }
      
      console.log(successMessage);
      return true;
    } catch (error) {
      console.error(errorMessage, error);
      
      if (showAlert) {
        alert(errorMessage);
      }
      
      return false;
    }
  }

  /**
   * Copy JSON data to clipboard
   * @param data - Data to stringify and copy
   * @param options - Configuration options
   * @returns Promise<boolean> - Success status
   */
  async function copyJSON(data: any, options: ClipboardOptions = {}): Promise<boolean> {
    try {
      const text = JSON.stringify(data, null, 2);
      return copy(text, options);
    } catch (error) {
      console.error('Failed to stringify JSON:', error);
      return false;
    }
  }

  return {
    copy,
    copyJSON
  };
}
