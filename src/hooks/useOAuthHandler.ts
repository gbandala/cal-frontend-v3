// hooks/useOAuthHandler.ts
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface OAuthSuccessMessages {
  [key: string]: string;
}

const OAUTH_SUCCESS_MESSAGES: OAuthSuccessMessages = {
  'microsoft_connected': "Outlook Calendar connected successfully!",
  'google_connected': "Google Calendar connected successfully!",
  'zoom_connected': "Zoom connected successfully!",
};

const OAUTH_ERROR_MESSAGES: OAuthSuccessMessages = {
  'microsoft_error': "Failed to connect Outlook Calendar. Please try again.",
  'google_error': "Failed to connect Google Calendar. Please try again.",
  'zoom_error': "Failed to connect Zoom. Please try again.",
};

interface UseOAuthHandlerProps {
  onSuccess?: (appType: string) => void;
  onError?: (appType: string, error?: string) => void;
}

export const useOAuthHandler = ({ onSuccess, onError }: UseOAuthHandlerProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const appType = searchParams.get('app_type');
    const errorMessage = searchParams.get('error_message');

    // Manejar éxito de OAuth
    if (success && appType) {
      console.log("🎉 [OAUTH_SUCCESS] Detectado retorno exitoso de OAuth", {
        success,
        appType,
        timestamp: new Date().toISOString()
      });

      // Mostrar mensaje de éxito
      const successMessage = OAUTH_SUCCESS_MESSAGES[success] || "Integration connected successfully!";
      toast.success(successMessage);

      // Ejecutar callback personalizado
      if (onSuccess) {
        onSuccess(appType);
      }

      // Limpiar query parameters
      searchParams.delete('success');
      searchParams.delete('app_type');
      setSearchParams(searchParams, { replace: true });
    }

    // Manejar errores de OAuth
    if (error && appType) {
      console.error("❌ [OAUTH_ERROR] Error en OAuth", {
        error,
        appType,
        errorMessage,
        timestamp: new Date().toISOString()
      });

      // Mostrar mensaje de error
      const errorMsg = OAUTH_ERROR_MESSAGES[error] || 
        errorMessage || 
        "Failed to connect integration. Please try again.";
      toast.error(errorMsg);

      // Ejecutar callback de error
      if (onError) {
        onError(appType, errorMessage || error);
      }

      // Limpiar query parameters
      searchParams.delete('error');
      searchParams.delete('app_type');
      searchParams.delete('error_message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, onSuccess, onError]);

  return {
    isHandlingOAuth: !!(searchParams.get('success') || searchParams.get('error'))
  };
};