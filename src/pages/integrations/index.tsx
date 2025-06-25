
import PageTitle from "@/components/PageTitle";
import IntegrationCard from "./_components/integration-card";
import { useQuery } from "@tanstack/react-query";
import { getAllIntegrationQueryFn } from "@/lib/api";
import { Loader } from "@/components/loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useOAuthHandler } from "@/hooks/useOAuthHandler"; // Importar el hook

const Integrations = () => {
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["integration_list"],
    queryFn: getAllIntegrationQueryFn,
  });


  // 🔧 USAR EL HOOK DE OAUTH
  const { isHandlingOAuth } = useOAuthHandler({
    onSuccess: (appType) => {
      console.log(`✅ [OAUTH_SUCCESS] Integración ${appType} conectada exitosamente`);
      // Refrescar la lista de integraciones
      refetch();
    },
    onError: (appType, error) => {
      console.error(`❌ [OAUTH_ERROR] Error al conectar ${appType}:`, error);
      // Opcional: Realizar alguna acción adicional en caso de error
    }
  });

  // 🔧 FIX: Verificar la estructura correcta de datos
  // Usar solo data?.integrations ya que 'data' no existe en el tipo de respuesta
  const integrations = data?.integrations || [];

  // 🐛 DEBUG: Logs para verificar estructura
  console.log("🔍 [DEBUG] Raw data from API:", data);
  console.log("🔍 [DEBUG] Processed integrations:", integrations);
  console.log("🔍 [DEBUG] Integration count:", integrations.length);
  console.log("🔍 [DEBUG] Is handling OAuth:", isHandlingOAuth);

  return (
    <div className="flex flex-col !gap-5">
      <PageTitle
        title="Integrations & apps"
        subtitle="Connect all your apps directly from here. You need to connect these apps"
      />

      <ErrorAlert isError={isError} error={error} />

      <div className="relative flex flex-col gap-4">
        <section className="flex flex-col gap-4 text-muted-foreground">
          {/* Mostrar loader si está cargando O manejando OAuth */}
          {(isFetching || isError || isHandlingOAuth) ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <Loader size="lg" color="black" />
              {isHandlingOAuth && (
                <p className="ml-3 text-sm text-muted-foreground">
                  Processing integration...
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {integrations.length > 0 ? (
                  integrations.map((integration: any) => (
                    <IntegrationCard
                      key={integration.app_type}
                      isDisabled={
                        integration.app_type === "MICROSOFT_TEAMS"
                      }
                      appType={integration.app_type}
                      title={integration.title}
                      isConnected={integration.isConnected}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No integrations found</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Check API response structure in console
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};



export default Integrations;