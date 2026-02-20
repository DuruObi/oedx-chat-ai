import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { chatId, messages } = await req.json();

  // Create new chat if chatId is null
  let chat;
  if (!chatId) {
    chat = await prisma.chat.create({
      data: { title: messages[0]?.content || "New Chat" },
    });
  } else {
    chat = await prisma.chat.findUnique({ where: { id: chatId } });
  }

  // Call OpenAI streaming API
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  });

  const decoder = new TextDecoder();
  let assistantContent = "";

  const reader = stream[Symbol.asyncIterator]();
  for await (const chunk of reader) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) assistantContent += text;
  }

  // Save all messages to DB
  for (const m of messages) {
    await prisma.message.create({
      data: {
        role: m.role,
        content: m.content,
        chatId: chat!.id,
      },
    });
  }

  // Save assistant reply
  await prisma.message.create({
    data: { role: "assistant", content: assistantContent, chatId: chat!.id },
  });

  return new Response(
    JSON.stringify({ chatId: chat!.id, content: assistantContent })
  );
}
