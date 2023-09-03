import "dotenv/config";

import { sql } from "@vercel/postgres";
export const test = async (event) => {
  const { rows: r } = await sql`SELECT * from instances`;

  return {
    statusCode: 200,
    body: JSON.stringify(r),
  };
};

export const createChatTable = async (deleteIfExists = false) => {
  //Create chat table for openai messages
  await sql`CREATE TABLE IF NOT EXISTS chat (
    id SERIAL PRIMARY KEY,
    chat_id TEXT NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`;
};

export const addChatMessage = async (chat_id, content, role) => {
  //if the role is system, update the system message
  if (role == "system") {
    const { rows: r } =
      await sql`SELECT * from chat WHERE chat_id = ${chat_id} AND role = 'system'`;
    if (r.length > 0) {
      const { id } = r[0];
      await sql`UPDATE chat SET content = ${content} WHERE id = ${id}`;
      return;
    } else {
      await sql`INSERT INTO chat (chat_id, content, role) VALUES (${chat_id}, ${content}, ${role})`;
    }
  } else {
    await sql`INSERT INTO chat (chat_id, content, role) VALUES (${chat_id}, ${content}, ${role})`;
  }
};

export const getChatMessages = async (chat_id) => {
  //return last 100 messages
  const { rows: r } =
    await sql`SELECT * from chat WHERE chat_id = ${chat_id} ORDER BY created_at  LIMIT 100`;
  return r;
};

//get all messages from db and return as openai format
export const getChatMessagesOpenAI = async (chat_id) => {
  const r = await getChatMessages(chat_id);

  //make sure that if role == system, it will be the first message
  const rr = r.sort((a, b) => {
    if (a.role == "system") {
      return -1;
    } else {
      return 1;
    }
  });

  const rr2 = rr.map((m) => {
    return {
      content: m.content,
      role: m.role,
    };
  });

  return rr2;
};
