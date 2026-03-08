import { createServiceClient } from "@/lib/supabase";

export type TelegramSession = {
  telegram_user_id: number;
  step: string;
  data: Record<string, string>;
  submission_id: string | null;
  current_question_idx: number;
};

export async function getSession(userId: number): Promise<TelegramSession | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("telegram_sessions")
    .select()
    .eq("telegram_user_id", userId)
    .maybeSingle();
  return data as TelegramSession | null;
}

export async function upsertSession(
  userId: number,
  update: Partial<Omit<TelegramSession, "telegram_user_id">>
): Promise<TelegramSession> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("telegram_sessions")
    .upsert({ telegram_user_id: userId, ...update, updated_at: new Date().toISOString() }, { onConflict: "telegram_user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as TelegramSession;
}

export async function clearSession(userId: number): Promise<void> {
  const db = createServiceClient();
  await db.from("telegram_sessions").delete().eq("telegram_user_id", userId);
}
