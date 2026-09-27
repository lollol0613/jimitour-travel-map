import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function createTrip(formData: FormData) {
  "use server";

  const supabase = await createServerSupabaseClient();

  const name = String(formData.get("name") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const memo = String(formData.get("memo") ?? "");
  const city = String(formData.get("city") ?? "");

  const { data, error } = await supabase
    .from("trips")
    .insert({
      name,
      city: city || null,
      start_date: startDate || null,
      end_date: endDate || null,
      memo: memo || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "여행을 만들지 못했습니다.");
  }

  const tripId = data.id;

  const { error: dayError } = await supabase.from("trip_days").insert({
    trip_id: tripId,
    day_number: 1,
    title: "Day 1",
  });

  if (dayError) {
    throw new Error(dayError.message);
  }

  redirect(`/trips/${tripId}`);
}

export default function NewTripPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← 여행 지도로 돌아가기
        </Link>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          여행 일정 만들기
        </h1>

        <form
          action={createTrip}
          className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">여행 이름</label>
            <input
              type="text"
              name="name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="예: Rotorua 2박 3일"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">대표 도시</label>

            <input
              type="text"
              name="city"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="예: Rotorua"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">시작일</label>
              <input
                type="date"
                name="start_date"
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
            <label className="mb-2 block text-sm font-medium">메모</label>
            <textarea
              name="memo"
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="여행 메모"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            여행 만들기
          </button>
        </form>
      </section>
    </main>
  );
}
