import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Locale is stored in localStorage, so middleware only passes requests through.
export default function middleware(_request: NextRequest) {
	return NextResponse.next();
}
