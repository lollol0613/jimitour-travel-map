import Link from "next/link";
import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import TripPlacePicker from "@/components/trip-place-picker";

interface AddPlacePageProps {
  params: Promise<{
    id: string;
    dayId: string;
  }>;
}

async function addPlaceToDay(tripId: string, dayId: string, placeId: string) {
  "use server";

  const supabase = await createServerSupabaseClient();

  const { data: lastItem, error: readError } = await supabase
    .from("trip_items")
    .select("position")
    .eq("trip_day_id", dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  const nextPosition = lastItem ? lastItem.position + 1 : 1;

  const { error: insertError } = await supabase.from("trip_items").insert({
    trip_day_id: dayId,
    item_type: "place",
    place_id: placeId,
    event_id: null,
    position: nextPosition,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function addPlaceAction(tripId: string, dayId: string, placeId: string) {
  "use server";

  await addPlaceToDay(tripId, dayId, placeId);
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export default async function AddPlacePage({ params }: AddPlacePageProps) {
  const { id, dayId } = await params;

  const { data: day, error: dayError } = await supabase
    .from("trip_days")
    .select("id, trip_id, day_number, title")
    .eq("id", dayId)
    .eq("trip_id", id)
    .single();

  if (dayError || !day) {
    notFound();
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, name, city")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    notFound();
  }

  const { data: existingTripPlaces, error: existingTripPlacesError } =
    await supabase
      .from("trip_items")
      .select(
        `
      place_id,
      item_type,
      trip_days!inner (
        trip_id
      ),
      places (
        id,
        latitude,
        longitude
      )
    `,
      )
      .eq("trip_days.trip_id", id)
      .eq("item_type", "place");

  if (existingTripPlacesError) {
    throw new Error(existingTripPlacesError.message);
  }

  const existingPlaceIds = new Set(
    (existingTripPlaces ?? []).map((item) => item.place_id),
  );

  const existingCoordinates = (existingTripPlaces ?? [])
    .map((item) => {
      const place = Array.isArray(item.places) ? item.places[0] : item.places;

      if (
        !place ||
        !Number.isFinite(place.latitude) ||
        !Number.isFinite(place.longitude)
      ) {
        return null;
      }

      return {
        latitude: place.latitude,
        longitude: place.longitude,
      };
    })
    .filter(
      (
        coordinate,
      ): coordinate is {
        latitude: number;
        longitude: number;
      } => coordinate !== null,
    );

  const center =
    existingCoordinates.length > 0
      ? {
          latitude:
            existingCoordinates.reduce(
              (sum, place) => sum + place.latitude,
              0,
            ) / existingCoordinates.length,
          longitude:
            existingCoordinates.reduce(
              (sum, place) => sum + place.longitude,
              0,
            ) / existingCoordinates.length,
        }
      : null;

  const { data: places, error: placesError } = await supabase
    .from("places")
    .select(
      "id, name, category, city, rating, latitude, longitude, status, memo, image_url",
    )
    .order("name", { ascending: true });

  if (placesError) {
    throw new Error(placesError.message);
  }

  const nearbyPlaces = (places ?? [])
    .filter((place) => !existingPlaceIds.has(place.id))
    .map((place) => {
      const distanceKm = center
        ? getDistanceKm(
            center.latitude,
            center.longitude,
            place.latitude,
            place.longitude,
          )
        : null;

      return {
        ...place,
        distanceKm,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;

      return a.distanceKm - b.distanceKm;
    });

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href={`/trips/${id}`}
          className="mb-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← 여행 일정으로 돌아가기
        </Link>

        <p className="mb-2 text-sm font-medium text-blue-600">
          {day.title ?? `Day ${day.day_number}`}
        </p>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">장소 추가</h1>

        {!places || places.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-5 text-zinc-600">
            등록된 장소가 없습니다.
          </p>
        ) : (
          <TripPlacePicker
            places={nearbyPlaces}
            tripCity={trip.city}
            tripId={id}
            dayId={dayId}
            addPlaceAction={addPlaceAction.bind(null, id, dayId)}
          />
        )}
      </section>
    </main>
  );
}
