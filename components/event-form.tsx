"use client";

import { useState } from "react";
import { createEvent } from "@/app/actions/event";

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

  if (blob.size > TARGET_FILE_SIZE) {
    throw new Error("압축 후에도 이미지 용량이 너무 큽니다.");
  }

  return new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, {
    type: "image/webp",
  });
}

export default function EventForm() {
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
        "이미지를 처리하지 못했습니다. 용량이 작은 JPG, PNG 또는 WebP 이미지를 선택해주세요.",
      );
    } finally {
      setProcessingImage(false);
    }
  }

  return (
    <form
      action={createEvent}
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">이벤트명</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">도시</label>
        <input
          name="city"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">월</label>

        <select
          name="event_month"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="">월 선택</option>
          <option value="1">1월</option>
          <option value="2">2월</option>
          <option value="3">3월</option>
          <option value="4">4월</option>
          <option value="5">5월</option>
          <option value="6">6월</option>
          <option value="7">7월</option>
          <option value="8">8월</option>
          <option value="9">9월</option>
          <option value="10">10월</option>
          <option value="11">11월</option>
          <option value="12">12월</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">시작일</label>

          <input
            type="date"
            name="start_date"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">종료일</label>

          <input
            type="date"
            name="end_date"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">카테고리</label>

        <input
          name="category"
          placeholder="예: Marathon, Festival, Parade"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">태그</label>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="tags"
              value="Baby"
              className="h-4 w-4 rounded border-zinc-300"
            />

            <span>👶 Baby</span>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">주소</label>

        <input
          name="address"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Latitude</label>

          <input
            name="latitude"
            type="number"
            step="any"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Longitude</label>

          <input
            name="longitude"
            type="number"
            step="any"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Website URL</label>

        <input
          name="website_url"
          type="url"
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
            className={`mt-2 text-xs ${
              imageMessage.startsWith("✓")
                ? "text-green-600"
                : imageMessage === "이미지 최적화 중..."
                  ? "text-zinc-500"
                  : "text-red-600"
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
        />
      </div>

      <button
        type="submit"
        disabled={processingImage}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {processingImage ? "이미지 처리 중..." : "이벤트 저장"}
      </button>
    </form>
  );
}
