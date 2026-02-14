import { NextResponse } from "next/server";
import { getDeleteCookieConfig } from "@/lib/jwt";

export async function POST() {
  const cookie = getDeleteCookieConfig();
  const response = NextResponse.json({ success: true });

  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });

  return response;
}
