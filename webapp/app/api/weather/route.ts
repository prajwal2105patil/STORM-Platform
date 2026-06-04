import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const station_id = searchParams.get("station_id");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const metric = searchParams.get("metric");

  if (!station_id || !year || !month || !metric) {
    return NextResponse.json(
      { error: "Missing parameters: station_id, year, month, metric" },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("weather_monthly_stats")
      .select(metric)
      .eq("station_id", station_id)
      .eq("year", parseInt(year))
      .eq("month", parseInt(month))
      .single();

    if (error || !data) {
      return NextResponse.json(
        { value: null, error: error?.message || "No data found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      value: data[metric as keyof typeof data],
      station_id,
      year: parseInt(year),
      month: parseInt(month),
      metric,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
