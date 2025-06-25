import googleMeetLogo from "@/assets/google-meet.svg";
import googleCalendarLogo from "@/assets/google-calendar.svg";
import outlookCalendarLogo from "@/assets/microsoft-outlook.svg";
import microsoftTeamsLogo from "@/assets/microsoft-teams.svg";
import zoomLogo from "@/assets/zoom.svg";

// ✅ ENUMS SINCRONIZADOS CON BACKEND
export enum IntegrationAppEnum {
  GOOGLE_MEET_AND_CALENDAR = "GOOGLE_MEET_AND_CALENDAR",
  ZOOM_MEETING = "ZOOM_MEETING",
  MICROSOFT_TEAMS = "MICROSOFT_TEAMS",
  OUTLOOK_CALENDAR = "OUTLOOK_CALENDAR",
}

// ✅ ENUM SINCRONIZADO CON BACKEND BD
export enum EventLocationEnumType {
  GOOGLE_MEET_AND_CALENDAR = 'GOOGLE_MEET_AND_CALENDAR',
  // ZOOM_MEETING = 'ZOOM_MEETING',              // Mantener para compatibilidad
  OUTLOOK_WITH_ZOOM = 'OUTLOOK_WITH_ZOOM',    // ✅ Nuevo
  GOOGLE_WITH_ZOOM = 'GOOGLE_WITH_ZOOM',      // ✅ Nuevo
  OUTLOOK_WITH_TEAMS = 'OUTLOOK_WITH_TEAMS',  // ✅ Nuevo
}

// ✅ ENUM PARA PLATAFORMAS DE CONFERENCIA (UI)
export enum ConferencePlatform {
  GOOGLE_MEET = "GOOGLE_MEET",
  ZOOM = "ZOOM", 
  MICROSOFT_TEAMS = "MICROSOFT_TEAMS",
}

// ✅ ENUM PARA PROVEEDORES DE CALENDARIO
export enum CalendarProvider {
  GOOGLE = "google",
  OUTLOOK = "outlook",
}

export const IntegrationLogos: Record<IntegrationAppType, string | string[]> = {
  GOOGLE_MEET_AND_CALENDAR: [googleMeetLogo, googleCalendarLogo],
  ZOOM_MEETING: zoomLogo,
  MICROSOFT_TEAMS: microsoftTeamsLogo,
  OUTLOOK_CALENDAR: outlookCalendarLogo,
};

export type IntegrationAppType =
  | "GOOGLE_MEET_AND_CALENDAR"
  | "ZOOM_MEETING"
  | "MICROSOFT_TEAMS"
  | "OUTLOOK_CALENDAR";

export type IntegrationTitleType =
  | "Google Meet & Calendar"
  | "Zoom"
  | "Microsoft Teams"
  | "Outlook Calendar";

// Integration Descriptions
export const IntegrationDescriptions: Record<IntegrationAppType, string> = {
  GOOGLE_MEET_AND_CALENDAR:
    "Include Google Meet details in your Agenda events and sync with Google Calendar.",
  ZOOM_MEETING: "Include Zoom details in your Agenda events.",
  MICROSOFT_TEAMS:
    "Microsoft Teams integration for video conferencing and collaboration.",
  OUTLOOK_CALENDAR:
    "Outlook Calendar integration for scheduling and reminders.",
};

// ✅ MANTENER PARA COMPATIBILIDAD CON UI EXISTENTE
export enum VideoConferencingPlatform {
  GOOGLE_MEET_AND_CALENDAR = IntegrationAppEnum.GOOGLE_MEET_AND_CALENDAR,
  ZOOM_MEETING = IntegrationAppEnum.ZOOM_MEETING,
  MICROSOFT_TEAMS = IntegrationAppEnum.MICROSOFT_TEAMS,
}

// ✅ OPCIONES PARA UI (mantener igual para no romper)
export const locationOptions = [
  {
    label: "Google Meet",
    value: VideoConferencingPlatform.GOOGLE_MEET_AND_CALENDAR,
    logo: IntegrationLogos.GOOGLE_MEET_AND_CALENDAR?.[0],
    isAvailable: true,
    platform: ConferencePlatform.GOOGLE_MEET, // ✅ Nuevo campo
  },
  {
    label: "Zoom",
    value: VideoConferencingPlatform.ZOOM_MEETING,
    logo: IntegrationLogos.ZOOM_MEETING,
    isAvailable: true,
    platform: ConferencePlatform.ZOOM, // ✅ Nuevo campo
  },
  {
    label: "Microsoft",
    value: VideoConferencingPlatform.MICROSOFT_TEAMS,
    logo: IntegrationLogos.MICROSOFT_TEAMS,
    isAvailable: false,
    platform: ConferencePlatform.MICROSOFT_TEAMS, // ✅ Nuevo campo
  },
];

// ✅ HELPER FUNCTIONS PARA DETECCIÓN Y MAPEO

export const getCalendarProvider = (calendarId?: string, calendarName?: string): CalendarProvider => {
  if (!calendarId && !calendarName) return CalendarProvider.GOOGLE; // Default
  
  const searchTexts = [
    calendarId?.toLowerCase() || '',
    calendarName?.toLowerCase() || ''
  ].join(' ');
  
  // 🔍 PATRONES ESPECÍFICOS para Microsoft Graph (Outlook)
  const microsoftGraphPatterns = [
    // IDs típicos de Microsoft Graph API
    'aqmkad',  // Patrón más común como el tuyo: AQMkAD...
    'aamkad',  // Otro patrón común: AAMkAD...
    'mqmkad',  // Variante: MQMkAD...
    'ogmkad',  // Variante: OGMkAD...
  ];
  
  // 🔍 PATRONES AMPLIADOS para Outlook (general)
  const outlookPatterns = [
    // Dominios de email
    '@outlook.',
    '@hotmail.',
    '@live.',
    '@msn.',
    
    // Palabras clave en nombres
    'outlook',
    'microsoft',
    'office365',
    'exchange',
    
    // IDs internos que podría retornar el backend
    'outlook_calendar',
    'microsoft_calendar',
    
    // Patrones que podrían aparecer en respuestas de API
    'graph.microsoft',
    'office.com'
  ];
  
  // 🔍 PATRONES para Google
  const googlePatterns = [
    '@gmail.',
    '@googlemail.',
    'google',
    'calendar.google',
    'primary' // Google Calendar primary
  ];
  
  // 1️⃣ PRIORIDAD ALTA: Verificar patrones de Microsoft Graph primero
  if (microsoftGraphPatterns.some(pattern => searchTexts.includes(pattern))) {
    console.log('✅ [DETECTION] Microsoft Graph pattern detected:', { calendarId, calendarName });
    return CalendarProvider.OUTLOOK;
  }
  
  // 2️⃣ PRIORIDAD MEDIA: Buscar otros patrones de Outlook
  if (outlookPatterns.some(pattern => searchTexts.includes(pattern))) {
    console.log('✅ [DETECTION] Outlook pattern detected:', { calendarId, calendarName });
    return CalendarProvider.OUTLOOK;
  }
  
  // 3️⃣ PRIORIDAD BAJA: Buscar patrones de Google
  if (googlePatterns.some(pattern => searchTexts.includes(pattern))) {
    console.log('✅ [DETECTION] Google pattern detected:', { calendarId, calendarName });
    return CalendarProvider.GOOGLE;
  }
  
  // 4️⃣ FALLBACK: Si no podemos determinar, log warning
  console.warn('⚠️ Could not determine calendar provider from:', { 
    calendarId, 
    calendarName,
    searchTexts,
    firstChars: calendarId?.substring(0, 6) || 'N/A'
  });
  return CalendarProvider.GOOGLE; // Default conservador
};

export const buildLocationTypeFromSelection = (
  conferencePlatform: ConferencePlatform,
  calendarId?: string,
  calendarName?: string
): EventLocationEnumType => {
  const calendarProvider = getCalendarProvider(calendarId, calendarName);
  
  // Google Meet siempre usa Google Calendar (es integración nativa)
  if (conferencePlatform === ConferencePlatform.GOOGLE_MEET) {
    return EventLocationEnumType.GOOGLE_MEET_AND_CALENDAR;
  }
  
  // Zoom puede usar Google o Outlook Calendar
  if (conferencePlatform === ConferencePlatform.ZOOM) {
    return calendarProvider === CalendarProvider.OUTLOOK 
      ? EventLocationEnumType.OUTLOOK_WITH_ZOOM 
      : EventLocationEnumType.GOOGLE_WITH_ZOOM;
  }
  
  // Teams normalmente usa Outlook Calendar
  if (conferencePlatform === ConferencePlatform.MICROSOFT_TEAMS) {
    return calendarProvider === CalendarProvider.OUTLOOK
      ? EventLocationEnumType.OUTLOOK_WITH_TEAMS
      : EventLocationEnumType.OUTLOOK_WITH_TEAMS; // Por ahora solo Outlook
  }
  
  // Fallback (no debería llegar aquí)
  throw new Error(`Unsupported combination: ${conferencePlatform} + ${calendarProvider}`);
};

export const getLocationTypeInfo = (locationType: EventLocationEnumType) => {
  const infoMap = {
    [EventLocationEnumType.GOOGLE_MEET_AND_CALENDAR]: {
      meeting: 'Google Meet',
      calendar: 'Google Calendar',
      description: 'Google Meet with Google Calendar integration'
    },
    // [EventLocationEnumType.GOOGLE_WITH_ZOOM{
    //   meeting: 'Zoom', 
    //   calendar: 'Google Calendar (legacy)',
    //   description: 'Zoom meetings with Google Calendar (legacy mapping)'
    // },
    [EventLocationEnumType.GOOGLE_WITH_ZOOM]: {
      meeting: 'Zoom',
      calendar: 'Google Calendar', 
      description: 'Zoom meetings with Google Calendar tracking'
    },
    [EventLocationEnumType.OUTLOOK_WITH_ZOOM]: {
      meeting: 'Zoom',
      calendar: 'Outlook Calendar',
      description: 'Zoom meetings with Outlook Calendar tracking'
    },
    [EventLocationEnumType.OUTLOOK_WITH_TEAMS]: {
      meeting: 'Microsoft Teams',
      calendar: 'Outlook Calendar',
      description: 'Microsoft Teams with Outlook Calendar integration'
    }
  };
  
  return infoMap[locationType] || {
    meeting: 'Unknown',
    calendar: 'Unknown', 
    description: 'Unknown combination'
  };
};

export const isCombinationSupported = (
  conferencePlatform: ConferencePlatform,
  calendarProvider: CalendarProvider
): boolean => {
  // Google Meet solo con Google Calendar
  if (conferencePlatform === ConferencePlatform.GOOGLE_MEET) {
    return calendarProvider === CalendarProvider.GOOGLE;
  }
  
  // Zoom con ambos proveedores
  if (conferencePlatform === ConferencePlatform.ZOOM) {
    return true; // Soporta tanto Google como Outlook
  }
  
  // Teams solo con Outlook por ahora
  if (conferencePlatform === ConferencePlatform.MICROSOFT_TEAMS) {
    return calendarProvider === CalendarProvider.OUTLOOK;
  }
  
  return false;
};


export const getCalendarProviderFromMetadata = (
  calendarId?: string, 
  calendarName?: string,
  calendarMetadata?: { 
    provider?: string;
    source?: string;
    integration?: string;
  }
): CalendarProvider => {
  
  // 1️⃣ Si tenemos metadata explícita, usarla
  if (calendarMetadata?.provider) {
    if (calendarMetadata.provider.toLowerCase().includes('outlook') || 
        calendarMetadata.provider.toLowerCase().includes('microsoft')) {
      return CalendarProvider.OUTLOOK;
    }
    if (calendarMetadata.provider.toLowerCase().includes('google')) {
      return CalendarProvider.GOOGLE;
    }
  }
  
  // 2️⃣ Fallback a detección por patrón
  return getCalendarProvider(calendarId, calendarName);
};

export const debugMicrosoftGraphId = (calendarId: string) => {
  console.log('\n🔍 DEBUGGING MICROSOFT GRAPH ID');
  console.log('Full ID:', calendarId);
  console.log('First 6 chars:', calendarId.substring(0, 6));
  console.log('Lowercase first 6:', calendarId.substring(0, 6).toLowerCase());
  
  const isGraphId = calendarId.toLowerCase().startsWith('aqmkad') || 
                   calendarId.toLowerCase().startsWith('aamkad');
  
  console.log('Is Microsoft Graph ID:', isGraphId);
  
  if (isGraphId) {
    console.log('✅ This should be detected as OUTLOOK');
  } else {
    console.log('❌ This is NOT being detected as Microsoft Graph');
    console.log('Consider adding pattern:', calendarId.substring(0, 6).toLowerCase());
  }
  
  return isGraphId;
};