import { NextResponse } from "next/server";
import { TERRITORIES } from "../../../../lib/constants/territories";

export async function GET() {
  return NextResponse.json({
    territories: TERRITORIES,
  });
}