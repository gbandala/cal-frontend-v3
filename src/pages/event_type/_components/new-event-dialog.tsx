import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "lucide-react";
import { 
  locationOptions, 
  VideoConferencingPlatform,
  ConferencePlatform,
  CalendarProvider,
  EventLocationEnumType,
  buildLocationTypeFromSelection,
  getCalendarProvider,
  getLocationTypeInfo,
  isCombinationSupported
} from "@/lib/types";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PROTECTED_ROUTES } from "@/routes/common/routePaths";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkIntegrationQueryFn, CreateEventMutationFn } from "@/lib/api";
import { toast } from "sonner";
import { Loader } from "@/components/loader";
import CalendarSelector from "@/components/calendar-selector";

const NewEventDialog = (props: { btnVariant?: string }) => {
  const { btnVariant } = props;

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: CreateEventMutationFn,
  });

  const [selectedLocationType, setSelectedLocationType] =
    useState<VideoConferencingPlatform | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // ✅ Estado específico por plataforma
  const [connectionStatus, setConnectionStatus] = useState<{
    [key in VideoConferencingPlatform]?: boolean;
  }>({});

  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Calendar selection state
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [selectedCalendarName, setSelectedCalendarName] = useState<string>("");

  const eventSchema = z.object({
    title: z.string().min(1, "Event name is required"),
    duration: z
      .number()
      .int({ message: "Duration must be a number" })
      .min(1, "Duration is required"),
    description: z.string().optional(),
    locationType: z
      .enum([
        VideoConferencingPlatform.GOOGLE_MEET_AND_CALENDAR,
        VideoConferencingPlatform.ZOOM_MEETING,
        VideoConferencingPlatform.MICROSOFT_TEAMS,
      ])
      .refine((value) => value !== undefined, {
        message: "Location type is required",
      }),
    calendar_id: z.string().optional(),
    calendar_name: z.string().optional(),
  });

  type EventFormData = z.infer<typeof eventSchema>;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      duration: 30,
      description: "",
      calendar_id: "",
      calendar_name: "",
    },
  });

  const { isValid } = form.formState;

  // ✅ MODIFICADO: Función que NO limpia calendarios automáticamente
  const handleLocationTypeChange = async (value: VideoConferencingPlatform) => {
    setSelectedLocationType(value);
    setError(null);

    // Si ya está verificado, solo actualizar el form
    if (connectionStatus[value] === true) {
      form.setValue("locationType", value);
      form.trigger("locationType");
      return;
    }

    // Verificar conexión según la plataforma
    if (
      value === VideoConferencingPlatform.GOOGLE_MEET_AND_CALENDAR ||
      value === VideoConferencingPlatform.ZOOM_MEETING ||
      value === VideoConferencingPlatform.MICROSOFT_TEAMS
    ) {
      setIsChecking(true);
      try {
        const { isConnected } = await checkIntegrationQueryFn(value);

        if (!isConnected) {
          const platformName = getPlatformName(value);
          setError(
            `${platformName} is not connected. <a href=${PROTECTED_ROUTES.INTEGRATIONS} target="_blank" class='underline text-primary'>Visit the integration page</a> to connect your account.`
          );
          setConnectionStatus(prev => ({ ...prev, [value]: false }));
          return;
        }

        // ✅ Marcar como conectado y actualizar form
        setConnectionStatus(prev => ({ ...prev, [value]: true }));
        form.setValue("locationType", value);
        form.trigger("locationType");

      } catch (error) {
        console.log(error);
        const platformName = getPlatformName(value);
        setError(`Failed to check ${platformName} integration status.`);
        setConnectionStatus(prev => ({ ...prev, [value]: false }));
      } finally {
        setIsChecking(false);
      }
    } else {
      // Para plataformas que no requieren verificación
      form.setValue("locationType", value);
      form.trigger("locationType");
    }
  };

  // ✅ Helper function para obtener nombres de plataforma
  const getPlatformName = (platform: VideoConferencingPlatform): string => {
    switch (platform) {
      case VideoConferencingPlatform.GOOGLE_MEET_AND_CALENDAR:
        return "Google Meet";
      case VideoConferencingPlatform.ZOOM_MEETING:
        return "Zoom";
      case VideoConferencingPlatform.MICROSOFT_TEAMS:
        return "Microsoft Teams";
      default:
        return "Platform";
    }
  };

  // ✅ Helper para verificar si una plataforma está conectada
  const isPlatformConnected = (platform: VideoConferencingPlatform): boolean => {
    return connectionStatus[platform] === true;
  };

  // ✅ NUEVA: Función de validación mejorada para combinaciones
  const isValidCombination = (): boolean => {
    if (!selectedLocationType) return false;
    
    // Para todas las plataformas: deben estar conectadas
    // Pero PERMITE cualquier calendario para Zoom/Teams
    return isPlatformConnected(selectedLocationType);
  };

  // ✅ NUEVA: Obtener plataforma de conferencia desde UI selection
  const getConferencePlatform = (uiSelection: VideoConferencingPlatform): ConferencePlatform => {
    switch (uiSelection) {
      case VideoConferencingPlatform.GOOGLE_MEET_AND_CALENDAR:
        return ConferencePlatform.GOOGLE_MEET;
      case VideoConferencingPlatform.ZOOM_MEETING:
        return ConferencePlatform.ZOOM;
      case VideoConferencingPlatform.MICROSOFT_TEAMS:
        return ConferencePlatform.MICROSOFT_TEAMS;
      default:
        throw new Error(`Unknown UI selection: ${uiSelection}`);
    }
  };

  // ✅ NUEVA: Obtener información de la combinación actual (MEJORADA)
  const getCurrentCombinationInfo = () => {
    if (!selectedLocationType) return null;
    
    try {
      const conferencePlatform = getConferencePlatform(selectedLocationType);
      
      // 🔧 MEJORADO: Usar tanto ID como nombre para detección
      const calendarProvider = getCalendarProvider(selectedCalendarId, selectedCalendarName);
      
      // 🐛 DEBUGGING: Log detallado
      console.log('🔍 [COMBINATION_DEBUG] Current selection:', {
        uiSelection: selectedLocationType,
        conferencePlatform,
        calendarId: selectedCalendarId,
        calendarName: selectedCalendarName,
        detectedProvider: calendarProvider
      });
      
      const targetLocationType = buildLocationTypeFromSelection(conferencePlatform, selectedCalendarId, selectedCalendarName);
      const info = getLocationTypeInfo(targetLocationType);
      const isSupported = isCombinationSupported(conferencePlatform, calendarProvider);
      
      // 🐛 DEBUGGING: Log resultado final
      console.log('🎯 [COMBINATION_RESULT]:', {
        targetLocationType,
        info,
        isSupported
      });
      
      return {
        conferencePlatform,
        calendarProvider,
        targetLocationType,
        info,
        isSupported,
        debug: {
          calendarId: selectedCalendarId,
          calendarName: selectedCalendarName,
          detectedProvider: calendarProvider
        }
      };
    } catch (error) {
      console.error("❌ [COMBINATION_ERROR] Error getting combination info:", error);
      return null;
    }
  };

  const handleCalendarChange = (calendarId: string, calendarName: string) => {
    setSelectedCalendarId(calendarId);
    setSelectedCalendarName(calendarName);
    form.setValue("calendar_id", calendarId);
    form.setValue("calendar_name", calendarName);
  };

  const handleCalendarError = (error: unknown) => {
    console.error("❌ [CALENDAR_ERROR] Error en selector de calendario:", error);
    toast.error("Error al cargar calendarios. Se usará el calendario principal.");
  };

  // ✅ FUNCIÓN onSubmit ACTUALIZADA CON NUEVA LÓGICA
  const onSubmit = (data: EventFormData) => {
    try {
      // 1️⃣ Obtener plataforma de conferencia desde selección UI
      const conferencePlatform = getConferencePlatform(data.locationType);
      
      // 2️⃣ Determinar el EventLocationEnumType específico basado en calendario
      const specificLocationType = buildLocationTypeFromSelection(
        conferencePlatform, 
        data.calendar_id,
        data.calendar_name
      );
      
      // 🔧 MEJORADO: Usar detección mejorada para debugging
      const detectedProvider = getCalendarProvider(data.calendar_id, data.calendar_name);
      
      // 3️⃣ Preparar datos con el tipo específico
      const submitData = {
        title: data.title,
        duration: data.duration,
        description: data.description || "",
        locationType: specificLocationType, // ✅ Enviar tipo específico, no genérico
        calendar_id: data.calendar_id || undefined,
        calendar_name: data.calendar_name || undefined,
      };

      // 4️⃣ Log para debugging
      const combinationInfo = getCurrentCombinationInfo();
      console.log("📝 [SUBMIT_EVENT] Datos preparados para envío:", {
        uiSelection: data.locationType,
        detectedPlatform: conferencePlatform,
        calendarInfo: {
          id: data.calendar_id,
          name: data.calendar_name,
          detectedProvider: detectedProvider
        },
        finalLocationType: specificLocationType,
        combinationInfo: combinationInfo?.info,
        submitData
      });

      // 5️⃣ Enviar al backend
      mutate(submitData, {
        onSuccess: (response) => {
          queryClient.invalidateQueries({
            queryKey: ["event_list"],
          });

          // Reset all states
          setSelectedCalendarId("");
          setSelectedCalendarName("");
          setSelectedLocationType(null);
          setConnectionStatus({});
          setError(null);
          setIsOpen(false);
          form.reset();

          console.log("✅ [EVENT_CREATED] Evento creado exitosamente", {
            eventId: response.event?.id,
            finalLocationType: specificLocationType,
            calendarUsed: response.event?.calendar_id || "primary",
            calendarName: response.event?.calendar_name || "Calendario principal"
          });

          toast.success("Event created successfully");
        },
        onError: (error) => {
          console.error("❌ [EVENT_CREATE_ERROR] Error al crear evento:", error);
          toast.error("Failed to create event");
        },
      });
    } catch (error) {
      console.error("❌ [SUBMIT_ERROR] Error en preparación de datos:", error);
      toast.error("Error preparing event data");
    }
  };

  // ✅ INFORMACIÓN DINÁMICA SOBRE LA COMBINACIÓN ACTUAL (MEJORADA)
  const renderCombinationInfo = () => {
    const info = getCurrentCombinationInfo();
    if (!info) return null;

    return (
      <div className="text-xs text-gray-500 mt-2 p-3 bg-gray-50 rounded border">
        <div className="font-medium mb-2 text-sm">
          📋 Configuration Preview:
        </div>
        
        {/* Información principal */}
        {/* <div className="space-y-1">
          <div>
            🎥 Meeting: <span className="font-medium">{info.info.meeting}</span>
          </div>
          <div>
            📅 Calendar: <span className="font-medium">{info.info.calendar}</span>
          </div>
        </div> */}
        
        {/* Información de debugging */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-400 space-y-1">
            <div>
              Selected Calendar: <span className="font-mono">{selectedCalendarName || 'Primary'}</span>
            </div>
            {/* <div>
              Calendar ID: <span className="font-mono">{selectedCalendarId || 'primary'}</span>
            </div>
            <div>
              Detected Provider: <span className="font-mono font-medium">{info.calendarProvider}</span>
            </div> */}
            <div>
              Will send: <span className="font-mono bg-gray-200 px-1 rounded">{info.targetLocationType}</span>
            </div>
          </div>
        </div>
        
        {/* Warnings o información adicional */}
        {!info.isSupported && (
          <div className="text-amber-600 mt-2 text-xs">
            ⚠️ This combination may have limited support
          </div>
        )}
        
        {/* Warning si la detección puede estar incorrecta */}
        {info.calendarProvider === CalendarProvider.GOOGLE && 
         (selectedCalendarName?.toLowerCase().includes('outlook') || 
          selectedCalendarName?.toLowerCase().includes('microsoft')) && (
          <div className="text-orange-600 mt-2 text-xs">
            🤔 Detection may be incorrect - calendar name suggests Outlook but detected as Google
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={btnVariant ? "default" : "outline"}
          size="lg"
          className={cn(
            `!w-auto !border-[#476788] !text-[#0a2540] !font-normal !text-sm`,
            btnVariant && "!text-white !border-primary"
          )}
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Event Type</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] !px-0 pb-0">
        <DialogHeader className="px-6">
          <DialogTitle className="text-xl">Add a new event type</DialogTitle>
          <DialogDescription>
            Create a new event type for people to book times with.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 px-6">
              <FormField
                name="title"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <Label className="font-semibold !text-base">
                      Event name
                    </Label>
                    <FormControl className="mt-2">
                      <Input placeholder="Name your event" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <Label className="font-semibold !text-base">
                      Description
                    </Label>
                    <FormControl className="mt-2">
                      <Textarea
                        className="focus-visible:ring-ring/0"
                        placeholder="Description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="duration"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <Label className="font-semibold !text-base">Duration</Label>
                    <FormControl className="mt-2">
                      <Input
                        {...field}
                        type="number"
                        placeholder="Duration"
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value) && value > 0) {
                            field.onChange(parseInt(e.target.value, 10));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="locationType"
                control={form.control}
                render={() => (
                  <FormItem>
                    <Label className="font-semibold !text-base">
                      Location Type
                    </Label>
                    <FormControl className="w-full mt-2">
                      <div className="grid grid-cols-4 gap-2">
                        {locationOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              `w-full h-[70px] cursor-pointer border disabled:pointer-events-none border-[#B2B2B2] mx-auto pt-1 pr-0.5 pl-0.5 rounded-[5px] flex flex-col items-center justify-center`,
                              selectedLocationType === option.value &&
                              "border-primary bg-primary/10",
                              !option.isAvailable &&
                              "pointer-events-none !text-gray-400 opacity-80 grayscale",
                              selectedLocationType === option.value &&
                              !!error &&
                              "!border-destructive !bg-destructive/10",
                              // ✅ Verificar conexión específica por plataforma
                              isPlatformConnected(option.value) &&
                              selectedLocationType === option.value &&
                              "!border-green-500 !bg-green-50"
                            )}
                            disabled={isChecking}
                            onClick={() => {
                              handleLocationTypeChange(option.value);
                            }}
                          >
                            {isChecking &&
                              selectedLocationType === option.value ? (
                              <Loader size="sm" />
                            ) : (
                              <>
                                <img
                                  src={option.logo as string}
                                  alt={option.label}
                                  width="20px"
                                  height="20px"
                                />
                                <span className="mt-1 text-sm">
                                  {option.label}
                                </span>
                                {/* ✅ Indicador visual de estado de conexión */}
                                {isPlatformConnected(option.value) && (
                                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                                )}
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </FormControl>

                    {error ? (
                      <FormMessage>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: error,
                          }}
                        />
                      </FormMessage>
                    ) : (
                      <FormMessage />
                    )}
                  </FormItem>
                )}
              />

              <FormField
                name="calendar_id"
                control={form.control}
                render={() => (
                  <FormItem>
                    <Label className="font-semibold !text-base">
                      Calendar
                      <span className="font-normal text-sm text-gray-500 ml-2">
                        (Optional - defaults to primary calendar)
                      </span>
                    </Label>
                    <FormControl className="mt-2">
                      <CalendarSelector
                        value={selectedCalendarId}
                        onChange={handleCalendarChange}
                        onlyWritable={true}
                        onlyActive={true}
                        allowEmpty={true}
                        emptyLabel="Use primary calendar"
                        placeholder="Select a specific calendar"
                        showSyncButton={true}
                        onError={handleCalendarError}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                    
                    {/* ✅ NUEVA: Información de la combinación actual */}
                    {selectedLocationType && renderCombinationInfo()}
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter
              className="bg-[#f6f7f9] border-t px-6 py-3 !mt-6
             border-[#e5e7eb] rounded-b-[8px]"
            >
              <Button
                type="submit"
                disabled={
                  !isValid ||
                  isPending ||
                  !isValidCombination()
                }
              >
                {isPending ? (
                  <Loader size="sm" color="white" />
                ) : (
                  <span>Create</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEventDialog;