import Link from "next/link";
import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getRatingLabel } from "@/lib/rating";
import type { Place } from "@/types/place";
import { redirect } from "next/navigation";
import sharp from "sharp";

interface EditPlacePageProps {
  params: Promise<{
    id: string;
  }>;
}

async function updatePlace(id: string, formData: FormData) {
  "use server";

  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "");
  const category = String(formData.get("category") ?? "");
  const city = String(formData.get("city") ?? "");
  const status = String(formData.get("status") ?? "");
  const address = String(formData.get("address") ?? "");
  const memo = String(formData.get("memo") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");

  const imageFile = formData.get("image_file");

  let finalImageUrl = imageUrl || null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const inputBuffer = Buffer.from(await imageFile.arrayBuffer());

    const webpBuffer = await sharp(inputBuffer)
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
      })
      .toBuffer();

    const fileName = `${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("place-image")
      .upload(fileName, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("place-image")
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));

  const tags = formData.getAll("tags").map((value) => String(value));

  const ratingValue = formData.get("rating");
  const rating =
    ratingValue === null || String(ratingValue).trim() === ""
      ? null
      : Number(ratingValue);

  const { data, error } = await supabase
    .from("places")
    .update({
      name,
      category,
      city: city || null,
      status,
      address: address || null,
      memo: memo || null,
      latitude,
      longitude,
      rating,
      image_url: finalImageUrl,
      tags,
    })
    .eq("id", id)
    .select("id, rating");

  console.log("UPDATE RESULT:", {
    id,
    rating,
    data,
    error,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("장소가 업데이트되지 않았습니다.");
  }

  redirect(`/places/${id}`);
}

export default async function EditPlacePage({ params }: EditPlacePageProps) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: place, error } = await supabase
    .from("places")
    .select("*")
    .eq("id", id)
    .single<Place>();

  if (error || !place) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto w-full max-w-2xl">
        <Link
          href={`/places/${place.id}`}
          className="mb-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← 상세페이지로 돌아가기
        </Link>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">장소 수정</h1>

        <form
          action={updatePlace.bind(null, place.id)}
          className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">장소명</label>
            <input
              type="text"
              name="name"
              defaultValue={place.name}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">카테고리</label>
            <select
              name="category"
              defaultValue={place.category}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="accommodation">🏨 숙박</option>
              <option value="restaurant">🍴 맛집</option>
              <option value="attraction">📍 가볼 곳</option>
              <option value="cafe">☕ 카페</option>
              <option value="shopping">🛍 쇼핑</option>
              <option value="other">📌 기타</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">도시</label>
            <input
              type="text"
              name="city"
              defaultValue={place.city ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">상태</label>
            <select
              name="status"
              defaultValue={place.status}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="wishlist">🟡 가보고 싶은 곳</option>
              <option value="visited">🟢 다녀온 곳</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">태그</label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="tags"
                value="Baby"
                defaultChecked={place.tags?.includes("Baby") ?? false}
                className="h-4 w-4 rounded border-zinc-300"
              />

              <span>Baby</span>
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">주소</label>
            <input
              type="text"
              name="address"
              defaultValue={place.address ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">위도</label>
              <input
                type="number"
                step="any"
                name="latitude"
                defaultValue={place.latitude}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">경도</label>
              <input
                type="number"
                step="any"
                name="longitude"
                defaultValue={place.longitude}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">평점</label>
            <select
              name="rating"
              defaultValue={place.rating === null ? "" : String(place.rating)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">평점 없음</option>
              <option value="0">🚫 절대 가지 말기</option>
              <option value="1">👎 비추</option>
              <option value="2">😕 애매함</option>
              <option value="3">🙂 쏘쏘</option>
              <option value="4">👍 평타</option>
              <option value="4.5">⭐ 추천</option>
              <option value="5">🔥 개추</option>
            </select>

            <p className="mt-2 text-xs text-zinc-500">
              현재 평점: {getRatingLabel(place.rating)}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">메모</label>
            <textarea
              name="memo"
              rows={4}
              defaultValue={place.memo ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">이미지 URL</label>

            <input
              type="url"
              name="image_url"
              defaultValue={place.image_url ?? ""}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              이미지 업로드
            </label>

            <input
              name="image_file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-zinc-600
      file:mr-4
      file:rounded-md
      file:border-0
      file:bg-zinc-100
      file:px-4
      file:py-2
      file:text-sm
      file:font-medium
      hover:file:bg-zinc-200"
            />

            <p className="mt-1 text-xs text-zinc-500">
              새 이미지를 업로드하면 기존 이미지 URL보다 우선 적용됩니다.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            수정 저장
          </button>
        </form>
      </section>
    </main>
  );
}
