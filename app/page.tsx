import { connection } from "next/server";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import type { Place } from "@/types/place";

import PlaceBrowser from "@/components/place-browser";
import AdminOnly from "@/components/admin-only";

type PlaceListItem = Pick<
  Place,
  | "id"
  | "name"
  | "category"
  | "status"
  | "latitude"
  | "longitude"
  | "address"
  | "city"
  | "rating"
  | "memo"
  | "image_url"
  | "tags"
  | "created_at"
>;

export default async function Home() {
  await connection();

  const { data: places, error } = await supabase
    .from("places")
    .select(
      "id, name, category, status, latitude, longitude, address, city, rating, memo, image_url, tags, created_at",
    )
    .returns<PlaceListItem[]>();

  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("id, name, city, memo")
    .order("created_at", { ascending: false });

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(
      `
    id,
    name,
    city,
    start_date,
    end_date,
    event_month,
    category,
    address,
    latitude,
    longitude,
    image_url,
    memo,
    tags, created_at
  `,
    )
    .order("start_date", { ascending: true });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  if (tripsError) {
    throw new Error(tripsError.message);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-600">
              지극히 주관적인 쌉T의 여행 추천
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              웰컴투뉴질랜드
            </h1>
          </div>

          <AdminOnly>
            <Link
              href="/add"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              + 장소/이벤트 추가
            </Link>
          </AdminOnly>
        </header>

        {trips && trips.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">추천 일정</p>
                <h2 className="text-xl font-semibold">
                  효율적인 뉴질랜드 여행 코스
                </h2>
              </div>

              <AdminOnly>
                <Link
                  href="/trips/new"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + 일정 만들기
                </Link>
              </AdminOnly>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      {trip.city && (
                        <p className="mb-1 text-sm font-medium text-blue-600">
                          📍 {trip.city}
                        </p>
                      )}

                      <h3 className="text-lg font-semibold group-hover:text-blue-600">
                        {trip.name}
                      </h3>
                    </div>

                    <span className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-blue-600">
                      →
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-zinc-600">
                    {trip.memo ?? "추천 여행 일정을 확인해보세요."}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="map-heading" className="mb-12">
          <PlaceBrowser places={places ?? []} events={events ?? []} />
        </section>
      </section>
    </main>
  );
}
