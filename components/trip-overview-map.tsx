"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, Popup, LngLatBounds, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type OverviewPlace = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  dayNumber: number;
  position: number;
};

interface TripOverviewMapProps {
  places: OverviewPlace[];
}

function getDayColor(dayNumber: number) {
  const colors = [
    "#ef4444", // Day 1 - red
    "#2563eb", // Day 2 - blue
    "#16a34a", // Day 3 - green
    "#f59e0b", // Day 4 - orange
    "#9333ea", // Day 5 - purple
    "#0891b2", // Day 6 - cyan
    "#db2777", // Day 7 - pink
    "#65a30d", // Day 8 - lime
    "#ea580c", // Day 9 - deep orange
    "#4f46e5", // Day 10 - indigo
    "#0f766e", // Day 11 - teal
    "#be123c", // Day 12 - rose
    "#7c3aed", // Day 13 - violet
    "#0284c7", // Day 14 - sky blue
    "#a16207", // Day 15 - amber brown
  ];

  return colors[(dayNumber - 1) % colors.length];
}

export default function TripOverviewMap({ places }: TripOverviewMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || places.length === 0) {
      return;
    }

    const map = new Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [places[0].longitude, places[0].latitude],
      zoom: 10,
    });

    map.on("load", () => {
      const bounds = new LngLatBounds();

      places.forEach((place) => {
        bounds.extend([place.longitude, place.latitude]);

        const markerElement = document.createElement("div");

        markerElement.textContent = `D${place.dayNumber}-${place.position}`;

        markerElement.className =
          "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-regular text-white shadow-sm";

        markerElement.style.backgroundColor = getDayColor(place.dayNumber);
        markerElement.style.opacity = "0.82";

        new Marker({
          element: markerElement,
        })
          .setLngLat([place.longitude, place.latitude])
          .setPopup(
            new Popup({
              offset: 18,
            }).setText(
              `Day ${place.dayNumber} · ${place.position}. ${place.name}`,
            ),
          )
          .addTo(map);
      });

      const dayNumbers = [
        ...new Set(places.map((place) => place.dayNumber)),
      ].sort((a, b) => a - b);

      const dayGroups = dayNumbers.map((dayNumber) => ({
        dayNumber,
        places: places
          .filter((place) => place.dayNumber === dayNumber)
          .sort((a, b) => a.position - b.position),
      }));

      // Day 내부 이동선
      dayGroups.forEach(({ dayNumber, places: dayPlaces }) => {
        if (dayPlaces.length < 2) {
          return;
        }

        const sourceId = `day-${dayNumber}-route`;

        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: dayPlaces.map((place) => [
                place.longitude,
                place.latitude,
              ]),
            },
          },
        });

        map.addLayer({
          id: sourceId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-width": 4,
            "line-opacity": 0.75,
            "line-color": getDayColor(dayNumber),
          },
        });
      });

      // Day 사이 연결선
      for (let index = 1; index < dayGroups.length; index += 1) {
        const previousDay = dayGroups[index - 1];
        const currentDay = dayGroups[index];

        const previousLastPlace =
          previousDay.places[previousDay.places.length - 1];

        const currentFirstPlace = currentDay.places[0];

        if (!previousLastPlace || !currentFirstPlace) {
          continue;
        }

        const sourceId = `day-connector-${previousDay.dayNumber}-${currentDay.dayNumber}`;

        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [previousLastPlace.longitude, previousLastPlace.latitude],
                [currentFirstPlace.longitude, currentFirstPlace.latitude],
              ],
            },
          },
        });

        map.addLayer({
          id: sourceId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-width": 3,
            "line-opacity": 0.65,
            "line-color": "#71717a",
            "line-dasharray": [2, 2],
          },
        });
      }

      if (places.length === 1) {
        map.setCenter([places[0].longitude, places[0].latitude]);
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, {
          padding: 60,
          maxZoom: 13,
        });
      }
    });

    return () => {
      map.remove();
    };
  }, [places]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">전체 일정</h2>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div
          ref={mapContainerRef}
          className="h-[460px] w-full overflow-hidden rounded-xl"
        />

        <div className="max-h-[460px] overflow-y-auto pr-1">
          <div className="space-y-5">
            {[...new Set(places.map((place) => place.dayNumber))]
              .sort((a, b) => a - b)
              .map((dayNumber) => {
                const dayPlaces = places
                  .filter((place) => place.dayNumber === dayNumber)
                  .sort((a, b) => a.position - b.position);

                return (
                  <div key={dayNumber}>
                    <h3 className="mb-2 text-sm font-semibold text-zinc-950">
                      Day {dayNumber}
                    </h3>

                    <div className="space-y-2">
                      {dayPlaces.map((place) => {
                        const categoryIcon =
                          place.category === "accommodation"
                            ? "🏨"
                            : place.category === "restaurant"
                              ? "🍴"
                              : place.category === "attraction"
                                ? "📍"
                                : place.category === "cafe"
                                  ? "☕"
                                  : place.category === "shopping"
                                    ? "🛍"
                                    : "📌";

                        return (
                          <div
                            key={place.id}
                            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3"
                          >
                            <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-600">
                              D{place.dayNumber}-{place.position}
                            </span>

                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                              {place.name}
                            </span>

                            <span
                              className="shrink-0 text-lg"
                              title={place.category}
                            >
                              {categoryIcon}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
