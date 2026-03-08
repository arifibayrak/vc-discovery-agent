import { NextRequest, NextResponse } from "next/server";
import { getFile, getSignedUrl, deleteFile } from "@/dal/uploads";
import { errorResponse } from "@/lib/errors";

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
    return errorResponse(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    await deleteFile(fileId);
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
