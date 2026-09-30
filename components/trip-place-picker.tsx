"use client";

import { useState } from "react";
import { getRatingLabel } from "@/lib/rating";

type CandidatePlace = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;

  status: "visited" | "wishlist";
  memo: string | null;
  image_url: string | null;
};

type TripPlacePickerProps = {
  places: CandidatePlace[];
  tripCity: string | null;
  tripId: string;
  dayId: string;
  addPlaceAction: (placeId: string) => Promise<void>;
};

export default function TripPlacePicker({
  places,
  tripCity,
  tripId,
  dayId,
  addPlaceAction,
}: TripPlacePickerProps) {
  const [radius, setRadius] = useState<"city" | "30" | "60" | "all">("city");
  const [category, setCategory] = useState<
    | "all"
    | "accommodation"
    | "restaurant"
    | "attraction"
    | "cafe"
    | "shopping"
    | "other"
  >("all");

  const [addedPlaceIds, setAddedPlaceIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const visiblePlaces = places.filter((place) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      query === "" ||
      place.name.toLowerCase().includes(query) ||
      (place.city ?? "").toLowerCase().includes(query) ||
      place.category.toLowerCase().includes(query);

    const matchesCategory = category === "all" || place.category === category;

    if (!matchesSearch || !matchesCategory) {
      return false;
    }

    if (radius === "all") {
      return true;
    }

    if (radius === "city") {
      return place.city === tripCity;
    }

    if (place.distanceKm === null) {
      return false;
    }

    if (radius === "30") {
      return place.distanceKm <= 30;
    }

    if (radius === "60") {
      return place.distanceKm <= 60;
    }

    return true;
  });

  return (
    <div>
      <div className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="장소명 또는 도시 검색"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { value: "city", label: tripCity ? `${tripCity}` : "대표 도시" },
          { value: "30", label: "주변 30km" },
          { value: "60", label: "주변 60km" },
          { value: "all", label: "전체 보기" },
        ].map((option) => {
          const selected = radius === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setRadius(option.value as "city" | "30" | "60" | "all")
              }
              className={
                selected
                  ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { value: "all", label: "전체" },
          { value: "accommodation", label: "🏨 숙박" },
          { value: "restaurant", label: "🍴 맛집" },
          { value: "attraction", label: "📍 가볼 곳" },
          { value: "cafe", label: "☕ 카페" },
          { value: "shopping", label: "🛒 쇼핑" },
          { value: "other", label: "📌 기타" },
        ].map((option) => {
          const selected = category === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setCategory(
                  option.value as
                    | "all"
                    | "accommodation"
                    | "restaurant"
                    | "attraction"
                    | "cafe"
                    | "shopping"
                    | "other",
                )
              }
              className={
                selected
                  ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {visiblePlaces.map((place) => (
          <div
            key={place.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              {place.image_url && (
                <img
                  src={place.image_url}
                  alt={place.name}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="font-semibold">{place.name}</div>

                <div className="mt-1 text-sm text-zinc-500">
                  {place.city ?? "도시 없음"}

                  {place.distanceKm !== null && (
                    <> · {place.distanceKm.toFixed(1)}km</>
                  )}
                </div>

                <div className="mt-2 text-sm text-zinc-600">
                  {place.status === "visited" ? (
                    <>
                      🟢 지미픽
                      {place.rating !== null && (
                        <span className="ml-2">
                          · {getRatingLabel(place.rating)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>🟡 Wishlist</>
                  )}
                </div>
              </div>
            </div>

            {place.memo && (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
                {place.memo}
              </p>
            )}

            <form
              action={async () => {
                await addPlaceAction(place.id);

                setAddedPlaceIds((prev) =>
                  prev.includes(place.id) ? prev : [...prev, place.id],
                );
              }}
              className="mt-3"
            >
              <button
                type="submit"
                disabled={addedPlaceIds.includes(place.id)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-default disabled:border-green-200 disabled:bg-green-50 disabled:text-green-700"
              >
                {addedPlaceIds.includes(place.id)
                  ? "✓ 추가 완료"
                  : "이 Day에 추가"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
