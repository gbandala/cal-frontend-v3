import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import TabHeader from "./_components/tab-header";
import { Separator } from "@/components/ui/separator";
import TabPanel from "./_components/tab-panel";
import useMeetingFilter from "@/hooks/use-meeting-filter";
import PageTitle from "@/components/PageTitle";
import { getUserMeetingsQueryFn } from "@/lib/api";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/loader";
import { useMemo } from "react"; 

// const Meetings = () => {
//   const { period } = useMeetingFilter();

//   const { data, isLoading, isFetching, isError, error } = useQuery({
//     queryKey: ["userMeetings", period],
//     queryFn: () => getUserMeetingsQueryFn(period),
//   });

//   const meetings = data?.meetings || [];

//   // console.log(data, "data");

//   return (
//     <div className="flex flex-col !gap-3">
//       <PageTitle title="Meetings" />

//       <ErrorAlert isError={isError} error={error} />

//       {isLoading || isError ? (
//         <div className="flex items-center justify-center min-h-[30vh]">
//           <Loader size="lg" color="black" />
//         </div>
//       ) : (
//         <div className="w-full">
//           <Card
//             className="p-0 shadow-[0_1px_6px_0_rgb(0_0_0_/_10%)]
//         min-h-[220px] border border-[#D4E16F)] bg-white rounded-[8px]
//         "
//           >
//             <CardContent className="p-0 pb-3">
//               <TabHeader />
//               <Separator className="border-[#D4E16F]" />
//               <TabPanel
//                 isFetching={isFetching}
//                 meetings={meetings}
//                 period={period}
//               />
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// };

const Meetings = () => {
  const { period } = useMeetingFilter();

  // ✅ OBTENER TIMEZONE DEL USUARIO
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('⚠️ Error getting user timezone, using UTC as fallback:', error);
      return 'UTC';
    }
  }, []);

  console.log('🌍 [MEETINGS_PAGE] User timezone detected:', {
    timezone: userTimezone,
    period
  });

  // ✅ QUERY ACTUALIZADA CON TIMEZONE
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["userMeetings", period, userTimezone], // ✅ INCLUIR TIMEZONE EN CACHE KEY
    queryFn: () => getUserMeetingsQueryFn(period, userTimezone), // ✅ PASAR TIMEZONE
    // Opcional: configuraciones adicionales
    staleTime: 30000, // Cache por 30 segundos
    // cacheTime: 300000, // Mantener en cache por 5 minutos
  });

  const meetings = data?.meetings || [];

  console.log('📅 [MEETINGS_PAGE] Meetings data received:', {
    meetingCount: meetings.length,
    timezone: userTimezone,
    period,
    firstMeeting: meetings[0] ? {
      id: meetings[0].id,
      guestName: meetings[0].guestName,
      startTime: meetings[0].startTime,
      endTime: meetings[0].endTime
    } : null
  });

  return (
    <div className="flex flex-col !gap-3">
      <PageTitle title="Meetings" />

      <ErrorAlert isError={isError} error={error} />

      {isLoading || isError ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loader size="lg" color="black" />
        </div>
      ) : (
        <div className="w-full">
          <Card
            className="p-0 shadow-[0_1px_6px_0_rgb(0_0_0_/_10%)]
        min-h-[220px] border border-[#D4E16F)] bg-white rounded-[8px]
        "
          >
            <CardContent className="p-0 pb-3">
              <TabHeader />
              <Separator className="border-[#D4E16F]" />
              <TabPanel
                isFetching={isFetching}
                meetings={meetings}
                period={period}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
export default Meetings;
