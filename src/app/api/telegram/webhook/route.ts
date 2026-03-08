import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { getSession, upsertSession, clearSession } from "@/dal/telegram-sessions";
import { createSubmission, getSubmissionByEmail } from "@/dal/submissions";
import { uploadFileToStorage, createFileRecord } from "@/dal/uploads";
import { isAllowedMimeType } from "@/schemas/upload";
import { v4 as uuidv4 } from "uuid";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// MIME → extension map for storage paths
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// Sniff real MIME type from magic bytes (handles octet-stream from Telegram)
function sniffMime(buf: Buffer, declaredMime: string): string {
  if (buf.length >= 4) {
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
    if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  }
  return declaredMime;
}

// Format the final summary message
function formatSummary(summary: {
  score: number;
  recommendation: string;
  executive_summary: string;
  strengths: string[];
  risks: string[];
}): string {
  const scoreEmoji = summary.score >= 75 ? "🟢" : summary.score >= 55 ? "🟡" : "🔴";
  const lines: string[] = [
    `${scoreEmoji} *Score: ${summary.score}/100*`,
    `📋 *${summary.recommendation}*`,
    "",
    summary.executive_summary,
  ];
  if (summary.strengths?.length) {
    lines.push("", "✅ *Strengths*");
    summary.strengths.forEach(s => lines.push(`• ${s}`));
  }
  if (summary.risks?.length) {
    lines.push("", "⚠️ *Risks*");
    summary.risks.forEach(r => lines.push(`• ${r}`));
  }
  lines.push("", "Your submission has been recorded. A partner will be in touch if there's a fit. Good luck! 🚀");
  return lines.join("\n");
}

// Run the full AI pipeline after file upload (called via after())
async function runPipeline(submissionId: string, telegramUserId: number, bot: Telegraf) {
  const send = (text: string) =>
    bot.telegram.sendMessage(telegramUserId, text, { parse_mode: "Markdown" });

  try {
    // 1. Extract
    await send("🔍 Extracting data from your pitch deck…");
    const extractRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/extract`, { method: "POST" });
    if (!extractRes.ok) throw new Error("Extraction failed");

    // 2. Validate + generate follow-ups
    const valRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/validate`, { method: "POST" });
    const valData = await valRes.json();

    if (valData.has_follow_ups) {
      // Update session to awaiting_answers and send first question
      const questions = valData.follow_up_questions ?? [];
      await upsertSession(telegramUserId, { step: "awaiting_answers", current_question_idx: 0 });
      if (questions.length > 0) {
        await send(`📝 A few quick questions to complete your profile (${questions.length} total):`);
        await send(`1️⃣ ${questions[0].question}${questions[0].context ? `\n_${questions[0].context}_` : ""}`);
      }
    } else {
      // 3. Generate summary immediately
      await send("📊 Generating your investor summary…");
      const sumRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/summary`, { method: "POST" });
      const summary = await sumRes.json();
      await upsertSession(telegramUserId, { step: "done" });
      await send(formatSummary(summary));
    }
  } catch (err) {
    console.error("Pipeline error:", err);
    await send("⚠️ Something went wrong during analysis. Please try again or use the web form at " + BASE_URL + "/apply");
    await upsertSession(telegramUserId, { step: "start" });
  }
}

// Build and configure the bot
function buildBot() {
  const bot = new Telegraf(TOKEN);

  // /start and /reset
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    await clearSession(userId);
    await upsertSession(userId, { step: "awaiting_company", data: {} });
    await ctx.reply(
      `👋 Welcome to *VC Discovery*!\n\nI'll help you submit your startup for AI-powered screening. It takes about 2 minutes.\n\nLet's start — what's your *company name*?`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("reset", async (ctx) => {
    await clearSession(ctx.from.id);
    await ctx.reply("✅ Session cleared. Send /start to begin again.");
  });

  bot.command("status", async (ctx) => {
    const session = await getSession(ctx.from.id);
    if (!session || session.step === "start") {
      await ctx.reply("No active submission. Send /start to begin.");
    } else {
      await ctx.reply(`Current step: *${session.step}*`, { parse_mode: "Markdown" });
    }
  });

  // Handle text messages
  bot.on(message("text"), async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    // Ignore commands handled above
    if (text.startsWith("/")) return;

    const session = await getSession(userId);
    if (!session || session.step === "start" || session.step === "done") {
      await ctx.reply("Send /start to begin a new submission.");
      return;
    }

    switch (session.step) {
      case "awaiting_company": {
        await upsertSession(userId, { step: "awaiting_name", data: { ...session.data, company_name: text } });
        await ctx.reply(`Great, *${text}*! 👏\n\nWhat's your *full name*?`, { parse_mode: "Markdown" });
        break;
      }

      case "awaiting_name": {
        await upsertSession(userId, { step: "awaiting_email", data: { ...session.data, contact_name: text } });
        await ctx.reply(`Nice to meet you, *${text}*! 🤝\n\nWhat's your *email address*?`, { parse_mode: "Markdown" });
        break;
      }

      case "awaiting_email": {
        const email = text.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await ctx.reply("That doesn't look like a valid email. Please try again:");
          return;
        }
        // Check for duplicate submission
        const existing = await getSubmissionByEmail(email);
        if (existing) {
          await ctx.reply("⚠️ This email has already been used to submit an application. Each email can only submit once.\n\nIf you need help, contact us directly.");
          return;
        }
        // Create the submission record
        const sub = await createSubmission({
          company_name: session.data.company_name,
          contact_name: session.data.contact_name,
          contact_email: email,
        });
        await upsertSession(userId, {
          step: "awaiting_file",
          data: { ...session.data, contact_email: email },
          submission_id: sub.id,
        });
        await ctx.reply(
          `✅ Submission created for *${session.data.company_name}*!\n\nNow please send your *pitch deck* — you can:\n• 📎 Upload a PDF or PPTX file directly\n• 🔗 Paste a Google Drive or Dropbox link`,
          { parse_mode: "Markdown" }
        );
        break;
      }

      case "awaiting_file": {
        // Handle link submission (Google Drive, Dropbox, direct URL)
        if (text.startsWith("http://") || text.startsWith("https://")) {
          if (!session.submission_id) { await ctx.reply("Session error. Send /reset and try again."); return; }
          await ctx.reply("⏳ Fetching your file from the link…");
          const linkRes = await fetch(`${BASE_URL}/api/submissions/${session.submission_id}/files/link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: text, file_type: "pitch_deck" }),
          });
          if (!linkRes.ok) {
            const err = await linkRes.json();
            await ctx.reply(`❌ ${err.error ?? "Could not fetch the file."}\n\nTry uploading the PDF directly instead.`);
            return;
          }
          await upsertSession(userId, { step: "processing" });
          await ctx.reply("✅ File received! Starting AI analysis…");
          after(() => runPipeline(session.submission_id!, userId, bot));
        } else {
          await ctx.reply("Please send a PDF/PPTX file or paste a Google Drive / Dropbox link.");
        }
        break;
      }

      case "awaiting_answers": {
        if (!session.submission_id) { await ctx.reply("Session error. Send /reset and try again."); return; }

        // Fetch pending follow-up questions
        const fuRes = await fetch(`${BASE_URL}/api/submissions/${session.submission_id}/follow-ups`);
        const fuData = await fuRes.json();
        const pending = (fuData.questions ?? fuData ?? []).filter((q: { status: string }) => q.status === "pending");

        if (pending.length === 0) {
          // All answered — generate summary
          await ctx.reply("📊 All questions answered! Generating your investor summary…");
          const sumRes = await fetch(`${BASE_URL}/api/submissions/${session.submission_id}/summary`, { method: "POST" });
          const summary = await sumRes.json();
          await upsertSession(userId, { step: "done" });
          await ctx.reply(formatSummary(summary), { parse_mode: "Markdown" });
          return;
        }

        const currentQ = pending[session.current_question_idx] ?? pending[0];
        // Save the answer
        await fetch(`${BASE_URL}/api/submissions/${session.submission_id}/follow-ups/${currentQ.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: text }),
        });

        const nextIdx = session.current_question_idx + 1;
        const remaining = pending.length - 1;

        if (remaining <= 0) {
          // Last question answered — generate summary
          await ctx.reply("📊 Thanks! Generating your investor summary…");
          after(async () => {
            const sumRes = await fetch(`${BASE_URL}/api/submissions/${session.submission_id!}/summary`, { method: "POST" });
            const summary = await sumRes.json();
            await upsertSession(userId, { step: "done" });
            await bot.telegram.sendMessage(userId, formatSummary(summary), { parse_mode: "Markdown" });
          });
        } else {
          // Send next question
          await upsertSession(userId, { current_question_idx: nextIdx });
          const nextQ = pending[1]; // always the next pending after answering current
          const qNum = nextIdx + 1;
          await ctx.reply(`${qNum}️⃣ ${nextQ.question}${nextQ.context ? `\n_${nextQ.context}_` : ""}`, { parse_mode: "Markdown" });
        }
        break;
      }

      case "processing": {
        await ctx.reply("⏳ Still analysing your pitch deck… I'll message you when it's ready!");
        break;
      }

      default:
        await ctx.reply("Send /start to begin.");
    }
  });

  // Handle document uploads (PDF, PPTX, etc.)
  bot.on(message("document"), async (ctx) => {
    const userId = ctx.from.id;
    const session = await getSession(userId);

    if (!session || session.step !== "awaiting_file") {
      await ctx.reply("Send /start first, then upload your pitch deck when asked.");
      return;
    }
    if (!session.submission_id) {
      await ctx.reply("Session error — send /reset and try again.");
      return;
    }

    const doc = ctx.message.document;
    await ctx.reply("⏳ Downloading and uploading your file…");

    try {
      // Download from Telegram servers
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const res = await fetch(fileLink.href);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Sniff the real MIME type
      const declaredMime = doc.mime_type ?? "application/octet-stream";
      const mime = sniffMime(buffer, declaredMime);

      if (!isAllowedMimeType(mime)) {
        await ctx.reply(`❌ Unsupported file type (${mime}). Please upload a PDF or PPTX file.`);
        return;
      }

      // Upload to Supabase Storage
      const ext = MIME_TO_EXT[mime] ?? "pdf";
      const storagePath = `${session.submission_id}/${uuidv4()}.${ext}`;
      await uploadFileToStorage(storagePath, buffer, mime);

      // Create DB record
      await createFileRecord({
        submission_id: session.submission_id,
        file_type: "pitch_deck",
        file_name: doc.file_name ?? `pitch-deck.${ext}`,
        mime_type: mime,
        size_bytes: buffer.byteLength,
        storage_path: storagePath,
      });

      await upsertSession(userId, { step: "processing" });
      await ctx.reply("✅ File received! Starting AI analysis… I'll message you when it's done (usually ~30 seconds).");

      // Run the pipeline in the background
      after(() => runPipeline(session.submission_id!, userId, bot));
    } catch (err) {
      console.error("Document upload error:", err);
      await ctx.reply("❌ Failed to process your file. Please try again or use the web form.");
    }
  });

  // Catch-all for other message types (photos, stickers, etc.)
  bot.on("message", async (ctx) => {
    await ctx.reply("Please send a text message or upload a PDF/PPTX file. Send /start to begin.");
  });

  return bot;
}

// Webhook handler
export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  try {
    const update = await req.json();
    const bot = buildBot();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
