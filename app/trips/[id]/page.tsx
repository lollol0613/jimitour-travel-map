import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import TripItineraryBoard from "@/components/trip-itinerary-board";
import AdminOnly from "@/components/admin-only";

interface TripPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function addDay(tripId: string) {
  "use server";

  const supabase = await createServerSupabaseClient();

  const { data: existingDays, error: readError } = await supabase
    .from("trip_days")
    .select("day_number")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: false })
    .limit(1);

  if (readError) {
    throw new Error(readError.message);
  }

  const nextDayNumber =
    existingDays && existingDays.length > 0
      ? existingDays[0].day_number + 1
      : 1;

  const { error: insertError } = await supabase.from("trip_days").insert({
    trip_id: tripId,
    day_number: nextDayNumber,
    title: `Day ${nextDayNumber}`,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath(`/trips/${tripId}`);
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, name, start_date, end_date, memo")
    .eq("id", id)
    .single();

  const { data: days, error: daysError } = await supabase
    .from("trip_days")
    .select("id, day_number, title")
    .eq("trip_id", id)
    .order("day_number", { ascending: true });

  const dayIds = days?.map((day) => day.id) ?? [];

  let tripItems = null;
  let tripItemsError = null;

  if (dayIds.length > 0) {
    const result = await supabase
      .from("trip_items")
      .select(
        `
        id,
        trip_day_id,
        item_type,
        position,
        place_id,
        event_id,
        travel_distance_text,
        travel_duration_text,
        places (
          id,
          name,
          category,
          city,
          rating,
          latitude,
          longitude,
          status,
          memo
        ),
        events (
          id,
          name,
          city,
          start_date,
          end_date,
          event_month,
          category,
          latitude,
          longitude,
          memo
        )
      `,
      )
      .in("trip_day_id", dayIds)
      .order("position", { ascending: true });

    tripItems = result.data;
    tripItemsError = result.error;
  }

  if (error || !trip) {
    notFound();
  }

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (tripItemsError) {
    throw new Error(tripItemsError.message);
  }

  type ItineraryItem = {
    id: string;
    tripDayId: string;
    position: number;

    itemType: "place" | "event";

    placeId: string | null;
    eventId: string | null;

    name: string;
    latitude: number | null;
    longitude: number | null;
    category: string;

    status: "visited" | "wishlist" | null;
    memo: string | null;

    travelDistanceText: string | null;
    travelDurationText: string | null;

    startDate: string | null;
    endDate: string | null;
    eventMonth: number | null;
  };

  const itineraryItems: ItineraryItem[] =
    tripItems?.flatMap<ItineraryItem>((item) => {
      if (item.item_type === "place") {
        const place = Array.isArray(item.places) ? item.places[0] : item.places;

        if (!place) {
          return [];
        }

        return [
          {
            id: item.id,
            tripDayId: item.trip_day_id,
            position: item.position,
            itemType: "place" as const,
            placeId: place.id,
            eventId: null,
            name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.category,
            status: place.status,
            memo: place.memo,

            travelDistanceText: item.travel_distance_text,
            travelDurationText: item.travel_duration_text,

            startDate: null,
            endDate: null,
            eventMonth: null,
          },
        ];
      }

      if (item.item_type === "event") {
        const event = Array.isArray(item.events) ? item.events[0] : item.events;

        if (!event) {
          return [];
        }

        return [
          {
            id: item.id,
            tripDayId: item.trip_day_id,
            position: item.position,
            itemType: "event" as const,
            placeId: null,
            eventId: event.id,
            name: event.name,
            latitude: event.latitude,
            longitude: event.longitude,
            category: "event",
            status: null,
            memo: event.memo,

            travelDistanceText: item.travel_distance_text,
            travelDurationText: item.travel_duration_text,

            startDate: event.start_date,
            endDate: event.end_date,
            eventMonth: event.event_month,
          },
        ];
      }

      return [];
    }) ?? [];

  const itineraryDays =
    days?.map((day) => ({
      id: day.id,
      dayNumber: day.day_number,
      title: day.title,
    })) ?? [];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← 여행 지도로 돌아가기
        </Link>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-blue-600">
                여행 일정
              </p>

              <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
            </div>

            <AdminOnly>
              <Link
                href={`/trips/${trip.id}/edit`}
                className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                일정 수정
              </Link>
            </AdminOnly>
          </div>

          <div className="mt-6 space-y-3 text-sm text-zinc-700">
            <p>
              <strong className="font-medium text-zinc-950">시작일:</strong>{" "}
              {trip.start_date ?? "미정"}
            </p>

            <p>
              <strong className="font-medium text-zinc-950">종료일:</strong>{" "}
              {trip.end_date ?? "미정"}
            </p>

            <p>
              <strong className="font-medium text-zinc-950">메모:</strong>{" "}
              {trip.memo ?? "메모 없음"}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">일정</h2>

            <AdminOnly>
              <form action={addDay.bind(null, trip.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  + Day
                </button>
              </form>
            </AdminOnly>
          </div>

          <TripItineraryBoard
            tripId={trip.id}
            days={itineraryDays}
            items={itineraryItems}
          />
        </div>
      </section>
    </main>
  );
}
