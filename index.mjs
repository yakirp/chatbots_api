import "dotenv/config";

import { embedder } from "./embeddings.mjs";
import { ask_ai } from "./utils.mjs";

export const handler = async (event) => {
  console.log("event", event);
  await embedder.init();
  const httpMethod = event?.requestContext?.http?.method ?? null;
  if (!httpMethod) {
    return "Unsupported method";
  }

  if (httpMethod === "GET") {
    // Handle GET request

    const text = event?.queryStringParameters?.text ?? null;
    const namespace = event?.queryStringParameters?.namespace ?? null;
    const scoreThreshold = event?.queryStringParameters?.scoreThreshold ?? 0.5;
    const user_id = event?.queryStringParameters?.user_id ?? null;
    if (!text || !namespace) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Bad Request",
        }),
      };
    }

    if (!scoreThreshold) {
      //generate scoreThreshold based on text length (from 0.2 for 1-2 words, to 0.5 for more than 4-6 words)
      const words = text.trim().split(" ");
      if (words.length <= 2) {
        scoreThreshold = 0.2;
      }
      if (words.length > 2 && words.length <= 4) {
        scoreThreshold = 0.3;
      }
      if (words.length > 4 && words.length <= 6) {
        scoreThreshold = 0.4;
      }
      if (words.length > 6) {
        scoreThreshold = 0.5;
      }
    }

    const task = await embedder.query(text, namespace, scoreThreshold);
    let ai = "";
    const _prompt = event?.queryStringParameters?.prompt ?? null;
    if (_prompt) {
      //get all text+ metadata from task
      let index = 0;
      const texts = task.map((t) => {
        return `
        [item ${++index}] text]\n
        ${t.text}\n
        [item ${index}] metadata\n
        ${JSON.stringify(t.metadata)}
        \n\n
        `;
      });

      const _task = `
      ${_prompt}\n
      You should use the context under [context] section generate the response.\n
      Return as JSON object { msg }.
      [context]
      ${texts.join("\n")}

      `;
      console.log("task", _task);
      const t = await ask_ai(
        _task,
        `${text}.\n`,
        user_id ? `chat_${user_id}` : null,
        true
      );
      console.log("t", t);
      //return can be msg or results
      ai = t?.msg ?? t?.results ?? "";
      //check if ai.msg
      if (ai?.msg) {
        ai = ai.msg;
      }

      return {
        assistant: ai,
        results: task,
      };
    }
    return {
      results: task,
    };
  } else if (httpMethod === "POST") {
    const requestBody = JSON.parse(event.body);

    const text = requestBody.text;
    if (!text) {
      return "Bad Request , text is required";
    }

    const namespace = requestBody.namespace;
    if (!namespace) {
      return "Bad Request , namespace is required";
    }

    let ai_metadata = {};
    const isNeedToConvert = requestBody?.prompt ? true : false;
    if (isNeedToConvert) {
      ai_metadata = await ask_ai(requestBody.prompt, text, null, true);

      console.log("ai_metadata", ai_metadata);
      //check that convert is object
      if (typeof ai_metadata !== "object") {
        ai_metadata = {};
        //continue
      }
    }
    const _ai_metadata = ai_metadata?.results ?? {};
    const metadata = requestBody?.metadata ?? {};

    //check that metadata is object
    if (typeof metadata !== "object") {
      return "Bad Request , metadata must be object";
    }

    await embedder.upsert(text, { ..._ai_metadata, ...metadata }, namespace);

    return {
      success: true,
      text,
      metadata: { ..._ai_metadata, ...metadata },
      namespace,
    };

    // Handle POST request
  } else {
    // Handle other types of requests or throw an error
    return "Method not allowed";
  }
};
