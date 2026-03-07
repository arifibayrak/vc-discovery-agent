import { NextRequest, NextResponse } from "next/server";
import { getFile, getSignedUrl } from "@/dal/uploads";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const file = await getFile(fileId);
    const url = await getSignedUrl(file.storage_path, 300); // 5-min URL
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
