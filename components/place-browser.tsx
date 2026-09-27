"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import TravelMap from "@/components/travel-map";
import { getRatingLabel } from "@/lib/rating";
import type { Place } from "@/types/place";
import { getGoogleMapsSearchUrl } from "@/lib/google-maps";
import AdminOnly from "@/components/admin-only";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";

const supabase = createBrowserSupabaseClient();

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
>;

type EventListItem = {
  id: string;
  name: string;
  city: string | null;
  start_date: string;
  end_date: string | null;
  event_month: number | null;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  memo: string | null;
  tags: string[] | null;
};

type FilterCategory =
  | "all"
  | "accommodation"
  | "restaurant"
  | "attraction"
  | "cafe"
  | "shopping"
  | "event"
  | "other";

interface PlaceBrowserProps {
  places: PlaceListItem[];
  events: EventListItem[];
}

const filters: {
  value: FilterCategory;
  label: string;
}[] = [
  { value: "all", label: "전체" },
  { value: "accommodation", label: "🏨 숙박" },
  { value: "restaurant", label: "🍴 맛집" },
  { value: "attraction", label: "📍 가볼 곳" },
  { value: "cafe", label: "☕ 카페" },
  { value: "shopping", label: "🛒 쇼핑" },
  { value: "event", label: "🎆 이벤트" },
  { value: "other", label: "📌 기타" },
];

function getCategoryLabel(category: FilterCategory) {
  switch (category) {
    case "accommodation":
      return "🏨 숙박";
    case "restaurant":
      return "🍴 맛집";
    case "attraction":
      return "📍 가볼 곳";
    case "cafe":
      return "☕ 카페";
    case "shopping":
      return "🛒 쇼핑";
    case "event":
      return "🎆 이벤트";
    default:
      return "📌 기타";
  }
}

export default function PlaceBrowser({ places, events }: PlaceBrowserProps) {
  const [selectedCategories, setSelectedCategories] = useState<
    Exclude<FilterCategory, "all">[]
  >([]);

  const [showFilters, setShowFilters] = useState(false);

  function toggleCategory(category: Exclude<FilterCategory, "all">) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function resetFilters() {
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedIsland("all");
    setSelectedCities([]);
    setSelectedCategories([]);
    setSelectedMonths([]);
    setSelectedTags([]);
  }

  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  function toggleCity(city: string) {
    setSelectedCities((current) =>
      current.includes(city)
        ? current.filter((item) => item !== city)
        : [...current, city],
    );
  }

  const [selectedIsland, setSelectedIsland] = useState<
    "all" | "north" | "south"
  >("all");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedStatuses, setSelectedStatuses] = useState<
    ("visited" | "wishlist")[]
  >([]);

  function toggleStatus(status: "visited" | "wishlist") {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleMonth(month: number) {
    setSelectedMonths((current) =>
      current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month],
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  const PAGE_SIZE = 20;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    selectedCities,
    selectedCategories,
    selectedIsland,
    selectedStatuses,
    selectedMonths,
    searchQuery,
    selectedTags,
  ]);

  const NORTH_ISLAND_CITIES = [
    "Auckland",
    "Albany",
    "Orewa",
    "Whangaparaoa",
    "Warkworth",
    "Matakana",
    "Wellsford",
    "Helensville",
    "Muriwai",
    "Piha",
    "Waiuku",
    "Pukekohe",
    "Hampton Downs",
    "Pokeno",
    "Hamilton",
    "Cambridge",
    "Raglan",
    "Te Awamutu",
    "Matamata",
    "Morrinsville",
    "Putaruru",
    "Tokoroa",
    "Waitomo",
    "Otorohanga",
    "Te Kuiti",
    "Taupo",
    "Turangi",
    "Rotorua",
    "Tauranga",
    "Mount Maunganui",
    "Papamoa",
    "Whakatane",
    "Opotiki",
    "Gisborne",
    "Napier",
    "Hastings",
    "Havelock North",
    "Palmerston North",
    "Feilding",
    "Whanganui",
    "New Plymouth",
    "Hawera",
    "Stratford",
    "Ohakune",
    "National Park",
    "Tongariro",
    "Wellington",
    "Lower Hutt",
    "Upper Hutt",
    "Porirua",
    "Kapiti Coast",
    "Paraparaumu",
    "Waikanae",
    "Levin",
    "Masterton",
    "Carterton",
    "Greytown",
    "Martinborough",
    "Wairarapa",
    "Paeroa",
    "Karangahake",
    "Thames",
    "Coromandel",
    "Whitianga",
    "Hahei",
    "Tairua",
    "Whangamata",
    "Kerikeri",
    "Paihia",
    "Russell",
    "Kaitaia",
    "Whangarei",
    "Dargaville",
    "Northland",
  ];

  const SOUTH_ISLAND_CITIES = [
    "Nelson",
    "Richmond",
    "Motueka",
    "Tasman",
    "Takaka",
    "Golden Bay",
    "Blenheim",
    "Picton",
    "Kaikoura",
    "Hanmer Springs",
    "Christchurch",
    "Lyttelton",
    "Akaroa",
    "Rangiora",
    "Kaiapoi",
    "Rolleston",
    "Ashburton",
    "Methven",
    "Timaru",
    "Geraldine",
    "Tekapo",
    "Lake Tekapo",
    "Twizel",
    "Mt Cook",
    "Mt.Cook",
    "Aoraki",
    "Oamaru",
    "Dunedin",
    "Mosgiel",
    "Balclutha",
    "Invercargill",
    "Bluff",
    "Te Anau",
    "Te A Nau",
    "Milford Sound",
    "Queenstown",
    "Arrowtown",
    "Cromwell",
    "Alexandra",
    "Wanaka",
    "Cardrona",
    "Haast",
    "Fox Glacier",
    "Franz Josef",
    "Hokitika",
    "Greymouth",
    "Westport",
    "West Coast",
    "Marlborough",
    "Canterbury",
    "Otago",
    "Southland",
  ];

  const cities = Array.from(
    new Set(
      places
        .map((place) => place.city)
        .filter((city): city is string => Boolean(city)),
    ),
  ).sort();

  const visibleCities = cities.filter((city) => {
    if (selectedIsland === "all") {
      return true;
    }

    if (selectedIsland === "north") {
      return NORTH_ISLAND_CITIES.includes(city);
    }

    return SOUTH_ISLAND_CITIES.includes(city);
  });

  const combinedItems = [
    ...places.map((place) => ({
      ...place,
      itemType: "place" as const,
      event_month: null,
      start_date: null,
      end_date: null,
    })),

    ...events.map((event) => ({
      id: event.id,
      name: event.name,
      category: "event" as const,
      status: null,
      latitude: event.latitude,
      longitude: event.longitude,
      address: event.address,
      city: event.city,
      rating: null,
      memo: event.memo,
      image_url: event.image_url,
      itemType: "event" as const,
      event_month: event.event_month,
      start_date: event.start_date,
      end_date: event.end_date,
      tags: event.tags,
    })),
  ];

  const filteredPlaces = combinedItems.filter((place) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(
        place.category as Exclude<FilterCategory, "all">,
      );

    const matchesCity =
      selectedCities.length === 0 ||
      (place.city !== null && selectedCities.includes(place.city));

    const matchesIsland =
      selectedIsland === "all" ||
      (place.city !== null &&
        (selectedIsland === "north"
          ? NORTH_ISLAND_CITIES.includes(place.city)
          : SOUTH_ISLAND_CITIES.includes(place.city)));

    const matchesStatus =
      place.itemType === "event"
        ? true
        : selectedStatuses.length === 0 ||
          (place.status !== null && selectedStatuses.includes(place.status));

    const query = searchQuery.trim().toLowerCase();

    const matchesMonth =
      place.itemType !== "event" ||
      selectedMonths.length === 0 ||
      (place.event_month !== null &&
        selectedMonths.includes(place.event_month));

    const matchesSearch =
      query === "" ||
      place.name.toLowerCase().includes(query) ||
      (place.city ?? "").toLowerCase().includes(query);

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => place.tags?.includes(tag));

    return (
      matchesCategory &&
      matchesCity &&
      matchesStatus &&
      matchesMonth &&
      matchesSearch &&
      matchesTags &&
      matchesIsland
    );
  });

  return (
    <div className="mx-auto grid w-full gap-6 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">필터</h2>

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-zinc-500 hover:text-blue-600"
          >
            초기화
          </button>
        </div>

        {/* 검색 */}
        <div className="border-b border-zinc-200 pb-5">
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            검색
          </label>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="장소, 이벤트, 도시"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 모바일용 필터 홀더 */}
        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 xl:hidden"
        >
          <span>추가 필터</span>
          <span>{showFilters ? "▲" : "▼"}</span>
        </button>

        <div className={`${showFilters ? "block" : "hidden"} xl:block`}>
          {/* 상태 */}
          <div className="border-b border-zinc-200 py-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">상태</h3>

            <div className="space-y-2.5">
              {[
                { value: "wishlist", label: "🟡 Wishlist" },
                { value: "visited", label: "🟢 지미Pick" },
              ].map((status) => {
                const value = status.value as "visited" | "wishlist";
                const checked = selectedStatuses.includes(value);

                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatus(value)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />

                    <span>{status.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Island */}
          <div className="border-b border-zinc-200 py-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Island</h3>

            <div className="space-y-2.5">
              {[
                { value: "all", label: "All" },
                { value: "north", label: "North Island(북섬)" },
                { value: "south", label: "South Island(남섬)" },
              ].map((island) => {
                const checked = selectedIsland === island.value;

                return (
                  <label
                    key={island.value}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedIsland(
                          island.value as "all" | "north" | "south",
                        );
                        setSelectedCities([]);
                      }}
                      className="h-4 w-4 rounded border-zinc-300"
                    />

                    <span>{island.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 도시 */}
          <div className="border-b border-zinc-200 py-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">도시</h3>

            <div className="max-h-44 space-y-2.5 overflow-y-auto pr-2">
              {visibleCities.map((city) => {
                const checked = selectedCities.includes(city);

                return (
                  <label
                    key={city}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCity(city)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />

                    <span>{city}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 카테고리 */}
          <div className="border-b border-zinc-200 py-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">
              카테고리
            </h3>

            <div className="space-y-2.5">
              {filters
                .filter((filter) => filter.value !== "all")
                .map((filter) => {
                  const value = filter.value as Exclude<FilterCategory, "all">;

                  const checked = selectedCategories.includes(value);

                  return (
                    <label
                      key={filter.value}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(value)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />

                      <span>{filter.label}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="border-b border-zinc-200 py-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">태그</h3>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={selectedTags.includes("Baby")}
                onChange={() => toggleTag("Baby")}
                className="h-4 w-4 rounded border-zinc-300"
              />

              <span>👶 with Baby</span>
            </label>
          </div>

          {/* 이벤트 월 */}
          {selectedCategories.includes("event") && (
            <div className="pt-5">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">
                이벤트 월
              </h3>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  const checked = selectedMonths.includes(month);

                  return (
                    <label
                      key={month}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMonth(month)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />

                      <span>{month}월</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <section aria-labelledby="map-heading">
          <TravelMap
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
          />
        </section>
      </div>

      <aside className="min-w-0 xl:max-h-[680px] xl:overflow-y-auto xl:pr-2">
        <h2 className="mb-4 text-xl font-semibold">목록</h2>

        {filteredPlaces.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-5 text-zinc-600">
            해당 조건에 등록된 장소가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredPlaces.slice(0, visibleCount).map((place) => (
              <li
                key={place.id}
                onClick={() => setSelectedPlaceId(place.id)}
                className="relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <AdminOnly>
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      const confirmed = window.confirm(
                        `"${place.name}"을(를) 완전히 삭제할까요?\n일정에 추가되어 있다면 해당 일정에서도 함께 제거됩니다.`,
                      );

                      if (!confirmed) {
                        return;
                      }

                      const { error } = await supabase
                        .from("places")
                        .delete()
                        .eq("id", place.id);

                      if (error) {
                        console.error("Failed to delete place:", error);
                        alert("삭제 중 오류가 발생했습니다.");
                        return;
                      }

                      window.location.reload();
                    }}
                    className="absolute -right-1 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-sm text-zinc-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label={`${place.name} 삭제`}
                    title="삭제"
                  >
                    ×
                  </button>
                </AdminOnly>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{place.name}</h3>

                    <p className="mt-1 text-sm text-zinc-600">
                      {getCategoryLabel(place.category)}
                      {place.city ? ` · ${place.city}` : ""}
                    </p>

                    {place.itemType === "event" ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        {place.start_date}

                        {place.end_date && place.end_date !== place.start_date
                          ? ` ~ ${place.end_date}`
                          : ""}

                        {place.event_month && (
                          <span className="ml-2">
                            · 매년 {place.event_month}월
                          </span>
                        )}

                        {place.tags?.includes("Baby") && (
                          <span className="ml-2">· 👶</span>
                        )}
                      </p>
                    ) : place.status === "visited" ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        🟢 지미픽
                        {place.rating !== null && (
                          <span className="ml-2">
                            · {getRatingLabel(place.rating)}
                          </span>
                        )}
                        {place.tags?.includes("Baby") && (
                          <span className="ml-2">· 👶</span>
                        )}
                      </p>
                    ) : place.status === "wishlist" ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        🟡 Wishlist
                        {place.tags?.includes("Baby") && (
                          <span className="ml-2">· 👶</span>
                        )}
                      </p>
                    ) : null}
                  </div>

                  {place.image_url && (
                    <img
                      src={place.image_url}
                      alt={place.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link
                    href={
                      place.itemType === "event"
                        ? `/events/${place.id}`
                        : `/places/${place.id}`
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    상세보기
                  </Link>

                  <a
                    href={
                      place.itemType === "event"
                        ? getGoogleMapsSearchUrl(
                            place.address || place.city || place.name,
                            null,
                          )
                        : getGoogleMapsSearchUrl(place.name, place.address)
                    }
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    {place.itemType === "event"
                      ? "행사 위치 보기"
                      : "Google Maps에서 보기"}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        {visibleCount < filteredPlaces.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            더 보기 ({filteredPlaces.length - visibleCount}개 남음)
          </button>
        )}
      </aside>
    </div>
  );
}
