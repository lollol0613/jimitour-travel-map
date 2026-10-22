"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import sharp from "sharp";

export async function createEvent(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim() || null;
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "") || null;
  const category = String(formData.get("category") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const websiteUrl = String(formData.get("website_url") || "").trim() || null;
  const imageUrl = String(formData.get("image_url") || "").trim() || null;

  const tags = formData.getAll("tags").map((value) => String(value));

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
      .from("event-image")
      .upload(fileName, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("event-image")
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  const memo = String(formData.get("memo") || "").trim() || null;

  const latitudeValue = String(formData.get("latitude") || "").trim();
  const longitudeValue = String(formData.get("longitude") || "").trim();

  const latitude = latitudeValue ? Number(latitudeValue) : null;
  const longitude = longitudeValue ? Number(longitudeValue) : null;
  const eventMonth = Number(formData.get("event_month"));

  const { error } = await supabase.from("events").insert({
    name,
    city,
    event_month: eventMonth,
    start_date: startDate,
    end_date: endDate,
    category,
    address,
    latitude,
    longitude,
    website_url: websiteUrl,
    image_url: finalImageUrl,
    memo,
    tags,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/");
}
