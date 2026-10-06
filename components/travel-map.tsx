"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Place } from "@/types/place";
import { getRatingLabel } from "@/lib/rating";

const AUCKLAND_CENTER: [number, number] = [174.7633, -36.8485];

type MapPlace = {
  id: string;
  name: string;
  category: Place["category"] | "event";
  status: Place["status"] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  rating: number | null;
  memo: string | null;
  image_url: string | null;
  tags: string[] | null;

  itemType: "place" | "event";

  start_date: string | null;
  end_date: string | null;
  event_month: number | null;
};

function getCategoryLabel(category: MapPlace["category"]) {
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

function getCategoryIcon(category: MapPlace["category"]) {
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

interface TravelMapProps {
  places: MapPlace[];
  selectedPlaceId?: string | null;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
}

function createPopupContent(place: MapPlace) {
  const content = document.createElement("div");
  content.className = "space-y-1 pr-4 pt-1 text-sm text-zinc-700";

  if (place.image_url) {
    const image = document.createElement("img");

    image.src = place.image_url;
    image.alt = place.name;
    image.className = "mb-3 h-20 w-full rounded-lg object-cover";

    content.appendChild(image);
  }

  const title = document.createElement("h3");
  title.className = "mb-2 text-base font-semibold text-zinc-950";
  title.textContent = place.name;
  content.appendChild(title);

  const details = [
    ["카테고리", getCategoryLabel(place.category)],
    ["주소", place.address ?? "주소 없음"],
    ["평점", getRatingLabel(place.rating)],
  ];

  for (const [label, value] of details) {
    const row = document.createElement("p");
    const labelElement = document.createElement("strong");
    labelElement.className = "font-medium text-zinc-950";
    labelElement.textContent = `${label}: `;
    row.append(labelElement, document.createTextNode(value));
    content.appendChild(row);
  }

  if (place.memo) {
    const memo = document.createElement("p");
    memo.className =
      "mt-3 border-t border-zinc-200 pt-3 leading-relaxed text-zinc-600";
    memo.textContent = place.memo;
    content.appendChild(memo);
  }

  const statusBadge = document.createElement("span");

  statusBadge.className =
    place.status === "visited"
      ? "mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
      : "mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700";

  statusBadge.textContent =
    place.status === "visited" ? "🟢 다녀온 곳" : "🟡 가보고 싶은 곳";

  content.appendChild(statusBadge);

  return content;
}

export default function TravelMap({
  places,
  selectedPlaceId,
  onBoundsChange,
}: TravelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<Record<string, maplibregl.Marker>>({});

  const lastFitKeyRef = useRef<string | null>(null);

  const placesKey = places
    .map(
      (place) => `${place.id}:${place.latitude ?? ""}:${place.longitude ?? ""}`,
    )
    .join("|");

  const onBoundsChangeRef = useRef(onBoundsChange);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: AUCKLAND_CENTER,
      zoom: 12,
    });

    mapRef.current = map;

    const updateBounds = () => {
      const bounds = map.getBounds();

      onBoundsChangeRef.current?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
    });

    map.on("moveend", updateBounds);

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.off("moveend", updateBounds);

      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (lastFitKeyRef.current === placesKey) {
      return;
    }

    const visiblePlaces = places.filter((place) => {
      if (place.latitude === null || place.longitude === null) {
        return false;
      }

      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);

      return Number.isFinite(latitude) && Number.isFinite(longitude);
    });

    if (visiblePlaces.length === 0) {
      return;
    }

    const fitMapToPlaces = () => {
      if (lastFitKeyRef.current === placesKey) {
        return;
      }

      lastFitKeyRef.current = placesKey;

      if (visiblePlaces.length === 1) {
        map.flyTo({
          center: [
            Number(visiblePlaces[0].longitude),
            Number(visiblePlaces[0].latitude),
          ],
          zoom: 12,
          essential: true,
        });

        return;
      }

      const bounds = new maplibregl.LngLatBounds();

      visiblePlaces.forEach((place) => {
        bounds.extend([Number(place.longitude), Number(place.latitude)]);
      });

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 12,
        duration: 800,
      });
    };

    if (map.loaded()) {
      fitMapToPlaces();
    } else {
      map.once("load", fitMapToPlaces);
    }

    return () => {
      map.off("load", fitMapToPlaces);
    };
  }, [places, placesKey]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const markers = places
      .filter(
        (place) =>
          place.longitude !== null &&
          place.latitude !== null &&
          Number.isFinite(Number(place.longitude)) &&
          Number.isFinite(Number(place.latitude)),
      )
      .map((place) => {
        const popup = new maplibregl.Popup({
          offset: 24,
          maxWidth: "280px",
        }).setDOMContent(createPopupContent(place));

        const markerElement = document.createElement("div");

        markerElement.textContent = getCategoryIcon(place.category);
        markerElement.className =
          "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-xl shadow-md";

        const marker = new maplibregl.Marker({
          element: markerElement,
        })
          .setLngLat([Number(place.longitude), Number(place.latitude)])
          .setPopup(popup)
          .addTo(map);

        markerRefs.current[place.id] = marker;

        return marker;
      });

    return () => {
      markers.forEach((marker) => marker.remove());
      markerRefs.current = {};
    };
  }, [places]);

  useEffect(() => {
    if (!selectedPlaceId) {
      return;
    }

    const map = mapRef.current;
    const marker = markerRefs.current[selectedPlaceId];

    if (!map || !marker) {
      return;
    }

    const lngLat = marker.getLngLat();

    map.flyTo({
      center: [lngLat.lng, lngLat.lat],
      zoom: 14,
      essential: true,
    });

    marker.togglePopup();
  }, [selectedPlaceId]);

  return (
    <div
      ref={mapContainerRef}
      role="region"
      aria-label="뉴질랜드 지도"
      className="h-[420px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 shadow-sm xl:h-[680px]"
    />
  );
}
