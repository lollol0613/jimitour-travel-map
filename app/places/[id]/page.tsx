import Link from "next/link";
import { notFound } from "next/navigation";

import { getGoogleMapsSearchUrl } from "@/lib/google-maps";
import { supabase } from "@/lib/supabase";
import type { Place } from "@/types/place";

import { getRatingLabel } from "@/lib/rating";

type PlaceDetail = Pick<
  Place,
  | "id"
  | "name"
  | "category"
  | "status"
  | "address"
  | "rating"
  | "memo"
  | "image_url"
>;

function getCategoryLabel(category: Place["category"]) {
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
    default:
      return "📌 기타";
  }
}

interface PlacePageProps {
  params: Promise<{ id: string }>;
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { id } = await params;
  const { data: place, error } = await supabase
    .from("places")
    .select("id, name, category, status, address, rating, memo, image_url")
    .eq("id", id)
    .returns<PlaceDetail[]>()
    .maybeSingle();

  if (error || !place) {
    notFound();
  }

  const googleMapsUrl = getGoogleMapsSearchUrl(place.name, place.address);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <article className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← 장소 목록으로
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-600">Jimitour</p>
          <h1 className="text-3xl font-bold tracking-tight">{place.name}</h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            {place.image_url ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <img
                  src={place.image_url}
                  alt={place.name}
                  className="h-full min-h-[360px] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-400">
                이미지 없음
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <dl className="grid gap-x-5 gap-y-5 sm:grid-cols-[7rem_1fr]">
              <dt className="font-medium text-zinc-500">Category</dt>
              <dd>{getCategoryLabel(place.category)}</dd>

              <dt className="font-medium text-zinc-500">Status</dt>
              <dd>
                <span
                  className={
                    place.status === "visited"
                      ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
                      : "inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700"
                  }
                >
                  {place.status === "visited"
                    ? "🟢 다녀온 곳"
                    : "🟡 가보고 싶은 곳"}
                </span>
              </dd>

              <dt className="font-medium text-zinc-500">Address</dt>
              <dd>{place.address ?? "주소 없음"}</dd>

              <dt className="font-medium text-zinc-500">Rating</dt>
              <dd>{getRatingLabel(place.rating)}</dd>

              <dt className="font-medium text-zinc-500">Memo</dt>
              <dd className="whitespace-pre-wrap">
                {place.memo ?? "메모 없음"}
              </dd>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Google Maps에서 보기
              </a>

              <Link
                href={`/places/${place.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                수정
              </Link>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
