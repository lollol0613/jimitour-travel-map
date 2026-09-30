"use client";

import { useState } from "react";
import { createPlace } from "@/app/actions/place";

const MAX_IMAGE_SIZE = 1600;
const TARGET_FILE_SIZE = 850 * 1024;

async function convertImageToWebp(file: File) {
  const bitmap = await createImageBitmap(file);

  let width = bitmap.width;
  let height = bitmap.height;

  if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
    const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("이미지를 처리할 수 없습니다.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;

  let blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  while (blob && blob.size > TARGET_FILE_SIZE && quality > 0.45) {
    quality -= 0.08;

    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
  }

  if (!blob) {
    throw new Error("WebP 변환에 실패했습니다.");
  }

  return new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, {
    type: "image/webp",
  });
}

export default function PlaceForm() {
  const [imageMessage, setImageMessage] = useState("");
  const [processingImage, setProcessingImage] = useState(false);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setImageMessage("");
      return;
    }

    try {
      setProcessingImage(true);
      setImageMessage("이미지 최적화 중...");

      const originalSize = file.size;

      const convertedFile = await convertImageToWebp(file);

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(convertedFile);
      input.files = dataTransfer.files;

      const originalMb = (originalSize / 1024 / 1024).toFixed(1);
      const convertedKb = Math.round(convertedFile.size / 1024);

      setImageMessage(
        `✓ ${originalMb}MB → ${convertedKb}KB WebP로 최적화되었습니다.`,
      );
    } catch (error) {
      console.error(error);

      input.value = "";

      setImageMessage(
        "이미지를 처리하지 못했습니다. 다른 이미지 파일을 선택해주세요.",
      );
    } finally {
      setProcessingImage(false);
    }
  }

  return (
    <form
      action={createPlace}
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">장소명</label>
        <input
          type="text"
          name="name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="예: Cordis Auckland"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">카테고리</label>
        <select
          name="category"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          defaultValue="accommodation"
        >
          <option value="accommodation">🏨 숙박</option>
          <option value="restaurant">🍴 맛집</option>
          <option value="attraction">📍 가볼 곳</option>
          <option value="cafe">☕ 카페</option>
          <option value="shopping">🛒 쇼핑</option>
          <option value="other">📌 기타</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">도시</label>
        <input
          type="text"
          name="city"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="예: Auckland, Rotorua, Taupo"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">상태</label>
        <select
          name="status"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          defaultValue="wishlist"
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
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="예: 83 Symonds Street, Auckland"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">위도</label>
          <input
            type="number"
            step="any"
            name="latitude"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="-36.8567"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">경도</label>
          <input
            type="number"
            step="any"
            name="longitude"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="174.7645"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">평점</label>
        <select
          name="rating"
          defaultValue=""
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
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">이미지 URL</label>

        <input
          name="image_url"
          type="url"
          placeholder="https://..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">이미지 업로드</label>

        <input
          name="image_file"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
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

        {imageMessage && (
          <p
            className={`mt-2 text-sm ${
              imageMessage.startsWith("✓") ? "text-green-600" : "text-zinc-500"
            }`}
          >
            {imageMessage}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">메모</label>
        <textarea
          name="memo"
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="이 장소에 대한 간단한 메모"
        />
      </div>

      <button
        type="submit"
        disabled={processingImage}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {processingImage ? "이미지 처리 중..." : "장소 저장"}
      </button>
    </form>
  );
}
