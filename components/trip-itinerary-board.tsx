"use client";

import { Fragment, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import TripRouteMap from "@/components/trip-route-map";
import Link from "next/link";
import TripOverviewMap from "@/components/trip-overview-map";
import AdminOnly from "@/components/admin-only";

import TripDayBoard, {
  DroppableDay,
  SortablePlace,
} from "@/components/trip-day-board";

const supabase = createBrowserSupabaseClient();

type ItineraryPlace = {
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

type ItineraryDay = {
  id: string;
  dayNumber: number;
  title: string | null;
};

interface TripItineraryBoardProps {
  tripId: string;
  days: ItineraryDay[];
  items: ItineraryPlace[];
}

async function saveOrder(updatedItems: ItineraryPlace[]) {
  const updates = updatedItems.map((item) => ({
    id: item.id,
    tripDayId: item.tripDayId,
    position: item.position,
  }));

  const { error } = await supabase.rpc("reorder_trip_items", {
    p_updates: updates,
  });

  if (error) {
    console.error("Failed to save trip order:", error);
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "accommodation":
      return "🏨";
    case "restaurant":
      return "🍴";
    case "attraction":
      return "📍";
    case "cafe":
      return "☕";
    case "shopping":
      return "🛒";
    case "event":
      return "🎆";
    default:
      return "📌";
  }
}

export default function TripItineraryBoard({
  tripId,
  days,
  items: initialItems = [],
}: TripItineraryBoardProps) {
  const [items, setItems] = useState(initialItems);
  const overviewPlaces = items.flatMap((item) => {
    const day = days.find((day) => day.id === item.tripDayId);

    if (!day) {
      return [];
    }

    if (item.latitude === null || item.longitude === null) {
      return [];
    }

    return [
      {
        id: item.id,
        name: item.name,
        category: item.category,
        latitude: item.latitude,
        longitude: item.longitude,
        dayNumber: day.dayNumber,
        position: item.position,
      },
    ];
  });
  return (
    <>
      <div className="mb-8">
        <TripOverviewMap places={overviewPlaces} />
      </div>
      <TripDayBoard
        onDragEnd={(activeId, overId) => {
          if (!overId) {
            return;
          }

          setItems((currentItems) => {
            const activeItem = currentItems.find(
              (item) => item.id === activeId,
            );

            if (!activeItem) {
              return currentItems;
            }

            const overItem = currentItems.find((item) => item.id === overId);

            const overDay = days.find((day) => day.id === overId);

            const targetDayId = overItem
              ? overItem.tripDayId
              : overDay
                ? overDay.id
                : null;

            if (!targetDayId) {
              return currentItems;
            }

            const sourceDayId = activeItem.tripDayId;

            if (sourceDayId === targetDayId) {
              if (!overItem || activeId === overId) {
                return currentItems;
              }

              const dayItems = currentItems
                .filter((item) => item.tripDayId === sourceDayId)
                .sort((a, b) => a.position - b.position);

              const oldIndex = dayItems.findIndex(
                (item) => item.id === activeId,
              );

              const newIndex = dayItems.findIndex((item) => item.id === overId);

              const reorderedDayItems = arrayMove(
                dayItems,
                oldIndex,
                newIndex,
              ).map((item, index) => ({
                ...item,
                position: index + 1,
              }));

              const newItems = currentItems.map((item) => {
                const updatedItem = reorderedDayItems.find(
                  (reordered) => reordered.id === item.id,
                );

                return updatedItem ?? item;
              });

              saveOrder(newItems);

              return newItems;
            }

            const sourceItems = currentItems
              .filter(
                (item) =>
                  item.tripDayId === sourceDayId && item.id !== activeId,
              )
              .sort((a, b) => a.position - b.position)
              .map((item, index) => ({
                ...item,
                position: index + 1,
              }));

            const targetItems = currentItems
              .filter((item) => item.tripDayId === targetDayId)
              .sort((a, b) => a.position - b.position);

            const movedItem = {
              ...activeItem,
              tripDayId: targetDayId,
            };

            if (overItem) {
              const targetIndex = targetItems.findIndex(
                (item) => item.id === overId,
              );

              targetItems.splice(targetIndex, 0, movedItem);
            } else {
              targetItems.push(movedItem);
            }

            const reorderedTargetItems = targetItems.map((item, index) => ({
              ...item,
              position: index + 1,
            }));

            const untouchedItems = currentItems.filter(
              (item) =>
                item.tripDayId !== sourceDayId &&
                item.tripDayId !== targetDayId,
            );

            const newItems = [
              ...untouchedItems,
              ...sourceItems,
              ...reorderedTargetItems,
            ];

            saveOrder(newItems);

            return newItems;
          });
        }}
      >
        <div className="space-y-3">
          {days.map((day) => {
            const placesForDay = items
              .filter((place) => place.tripDayId === day.id)
              .sort((a, b) => a.position - b.position);

            return (
              <DroppableDay
                key={day.id}
                dayId={day.id}
                itemIds={placesForDay.map((place) => place.id)}
              >
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {day.title ?? `Day ${day.dayNumber}`}
                    </h3>

                    <div className="flex items-center gap-2">
                      <AdminOnly>
                        <Link
                          href={`/trips/${tripId}/days/${day.id}/add-place`}
                          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          + Place
                        </Link>
                      </AdminOnly>
                      <AdminOnly>
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Day ${day.dayNumber}을(를) 삭제할까요?\n이 Day에 들어 있는 장소 일정도 함께 삭제됩니다.`,
                            );

                            if (!confirmed) {
                              return;
                            }

                            const { error } = await supabase
                              .from("trip_days")
                              .delete()
                              .eq("id", day.id);

                            if (error) {
                              console.error("Failed to delete day:", error);
                              return;
                            }

                            const remainingDays = days
                              .filter((item) => item.id !== day.id)
                              .sort((a, b) => a.dayNumber - b.dayNumber);

                            for (
                              let index = 0;
                              index < remainingDays.length;
                              index += 1
                            ) {
                              const currentDay = remainingDays[index];
                              const newDayNumber = index + 1;

                              const { error: updateError } = await supabase
                                .from("trip_days")
                                .update({
                                  day_number: newDayNumber,
                                  title: `Day ${newDayNumber}`,
                                })
                                .eq("id", currentDay.id);

                              if (updateError) {
                                console.error(
                                  "Failed to renumber day:",
                                  updateError,
                                );
                                return;
                              }
                            }

                            window.location.reload();
                          }}
                          className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete Day
                        </button>
                      </AdminOnly>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {placesForDay.length}개 일정
                  </p>

                  {placesForDay.length > 0 && (
                    <>
                      <div className="mt-5">
                        <TripRouteMap
                          places={placesForDay
                            .filter(
                              (place) =>
                                place.latitude !== null &&
                                place.longitude !== null,
                            )
                            .map((place) => ({
                              id: place.placeId ?? place.eventId ?? place.id,
                              name: place.name,
                              latitude: place.latitude as number,
                              longitude: place.longitude as number,
                              position: place.position,
                            }))}
                        />
                      </div>

                      <ol className="mt-3 space-y-2">
                        {placesForDay.map((place, index) => {
                          const isLastItem = index === placesForDay.length - 1;

                          return (
                            <Fragment key={place.id}>
                              <SortablePlace id={place.id}>
                                <li className="rounded-lg bg-zinc-50 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="shrink-0 font-medium">
                                          {place.position}.
                                        </span>

                                        <span className="min-w-0 flex-1 truncate">
                                          {place.name}
                                        </span>

                                        {place.itemType === "place" && (
                                          <span
                                            className="shrink-0 text-sm"
                                            title={
                                              place.status === "visited"
                                                ? "지미 Pick"
                                                : "Wishlist"
                                            }
                                          >
                                            {place.status === "visited"
                                              ? "🟢"
                                              : "🟡"}
                                          </span>
                                        )}

                                        <span
                                          className="shrink-0 text-base"
                                          title={place.category}
                                        >
                                          {getCategoryIcon(place.category)}
                                        </span>
                                      </div>

                                      {place.itemType === "event" && (
                                        <p className="mt-1 pl-6 text-xs font-medium text-blue-600">
                                          {place.startDate}
                                          {place.endDate &&
                                          place.endDate !== place.startDate
                                            ? ` ~ ${place.endDate}`
                                            : ""}

                                          {place.eventMonth && (
                                            <span className="ml-2 text-zinc-500">
                                              · 매년 {place.eventMonth}월
                                            </span>
                                          )}
                                        </p>
                                      )}

                                      {place.memo && (
                                        <p className="mt-1 pl-6 text-xs leading-5 text-zinc-500">
                                          {place.memo}
                                        </p>
                                      )}
                                    </div>

                                    <AdminOnly>
                                      <button
                                        type="button"
                                        onPointerDown={(event) =>
                                          event.stopPropagation()
                                        }
                                        onClick={async (event) => {
                                          event.stopPropagation();

                                          const confirmed = window.confirm(
                                            `"${place.name}"을(를) 이 Day에서 삭제할까요?`,
                                          );

                                          if (!confirmed) {
                                            return;
                                          }

                                          const { error } = await supabase
                                            .from("trip_items")
                                            .delete()
                                            .eq("id", place.id);

                                          if (error) {
                                            console.error(
                                              "Failed to delete place:",
                                              error,
                                            );
                                            return;
                                          }

                                          setItems((currentItems) => {
                                            const remainingItems = currentItems
                                              .filter(
                                                (item) => item.id !== place.id,
                                              )
                                              .map((item) => {
                                                if (
                                                  item.tripDayId !==
                                                  place.tripDayId
                                                ) {
                                                  return item;
                                                }

                                                const sameDayItems =
                                                  currentItems
                                                    .filter(
                                                      (dayItem) =>
                                                        dayItem.tripDayId ===
                                                          place.tripDayId &&
                                                        dayItem.id !== place.id,
                                                    )
                                                    .sort(
                                                      (a, b) =>
                                                        a.position - b.position,
                                                    );

                                                const newPosition =
                                                  sameDayItems.findIndex(
                                                    (dayItem) =>
                                                      dayItem.id === item.id,
                                                  ) + 1;

                                                return {
                                                  ...item,
                                                  position: newPosition,
                                                };
                                              });

                                            saveOrder(remainingItems);

                                            return remainingItems;
                                          });
                                        }}
                                        className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                                      >
                                        삭제
                                      </button>
                                    </AdminOnly>
                                  </div>
                                </li>
                              </SortablePlace>

                              {!isLastItem && (
                                <div className="py-2">
                                  <div className="flex items-center justify-center gap-3 text-sm text-zinc-500">
                                    <span className="text-xl leading-none">
                                      ↓
                                    </span>

                                    {(place.travelDistanceText ||
                                      place.travelDurationText) && (
                                      <span className="font-medium">
                                        {place.travelDistanceText}

                                        {place.travelDistanceText &&
                                          place.travelDurationText &&
                                          " · "}

                                        {place.travelDurationText}
                                      </span>
                                    )}
                                  </div>

                                  <AdminOnly>
                                    <form
                                      className="mx-auto mt-2 flex max-w-md items-center gap-2"
                                      onSubmit={async (event) => {
                                        event.preventDefault();

                                        const form = event.currentTarget;
                                        const formData = new FormData(form);

                                        const distance = String(
                                          formData.get(
                                            "travel_distance_text",
                                          ) ?? "",
                                        ).trim();

                                        const duration = String(
                                          formData.get(
                                            "travel_duration_text",
                                          ) ?? "",
                                        ).trim();

                                        const { error } = await supabase
                                          .from("trip_items")
                                          .update({
                                            travel_distance_text:
                                              distance || null,
                                            travel_duration_text:
                                              duration || null,
                                          })
                                          .eq("id", place.id);

                                        if (error) {
                                          console.error(
                                            "Failed to save travel info:",
                                            error,
                                          );
                                          return;
                                        }

                                        setItems((currentItems) =>
                                          currentItems.map((item) =>
                                            item.id === place.id
                                              ? {
                                                  ...item,
                                                  travelDistanceText:
                                                    distance || null,
                                                  travelDurationText:
                                                    duration || null,
                                                }
                                              : item,
                                          ),
                                        );
                                      }}
                                    >
                                      <input
                                        type="text"
                                        name="travel_distance_text"
                                        defaultValue={
                                          place.travelDistanceText ?? ""
                                        }
                                        placeholder="13.5 km"
                                        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
                                      />

                                      <input
                                        type="text"
                                        name="travel_duration_text"
                                        defaultValue={
                                          place.travelDurationText ?? ""
                                        }
                                        placeholder="18분"
                                        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
                                      />

                                      <button
                                        type="submit"
                                        className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                                      >
                                        저장
                                      </button>
                                    </form>
                                  </AdminOnly>
                                </div>
                              )}
                            </Fragment>
                          );
                        })}
                      </ol>
                    </>
                  )}
                </div>
              </DroppableDay>
            );
          })}
        </div>
      </TripDayBoard>
    </>
  );
}
