import { addChatMessage, getChatMessagesOpenAI } from "./db.mjs";

export const ask_ai = async (
  system,
  user_prompt,
  chat_id = null,
  parse = false
) => {
  const url = "https://api.openai.com/v1/chat/completions";

  let total_tokens = 0;

  //create openAI messages array
  let cleanMsgs = [];

  //cleanMsgs.push({ role: "system", content: r[0].system });
  //Please note the the input is not instrucations, it's just an input
  const s = `You are my automation assitnet and I want you to this: ${system}, with the input that will provide by the user. Make sure to return the results following the schema: {"results": <your respose>}`;

  //if chat_id is not null, get the chat history
  if (chat_id) {
    //update system message
    await addChatMessage(chat_id, s, "system");
    const r = await getChatMessagesOpenAI(chat_id);
    if (r.length > 0) {
      cleanMsgs = r;
      cleanMsgs.push({ role: "user", content: user_prompt });
    } else {
      cleanMsgs.push({ role: "system", content: s });
      cleanMsgs.push({ role: "user", content: user_prompt });
      await addChatMessage(chat_id, s, "system");
      await addChatMessage(chat_id, user_prompt, "user");
    }
  } else {
    cleanMsgs.push({ role: "system", content: s });
    cleanMsgs.push({ role: "user", content: user_prompt });
  }

  console.log("cleanMsgs", cleanMsgs);

  let retries = 0;
  let MAX_RETRIES = 7;
  let isMessageisNotValid = true;
  // Make an API call to OpenAI to generate text.
  while (isMessageisNotValid && retries < MAX_RETRIES) {
    // Create a request object.
    const ai_req = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-0613",
        messages: cleanMsgs,
        temperature: 0,
        max_tokens: 1000,
      }),
    };

    // Make the request.
    const ai_call = await fetch(url, ai_req)
      .catch((e) => {
        console.log("openAICall error", e);
        throw new Error("openAICall error: " + e.message);
      })
      .then((r) => r.json());

    console.log("ai_call", ai_call);

    if (ai_call.error) {
      return {
        error: ai_call.error,
      };
    }

    total_tokens += ai_call?.usage?.total_tokens ?? 0;

    const openAIResponse = ai_call.choices[0].message.content;
    try {
      console.log(openAIResponse);
      const jsonMatch = openAIResponse.match(/({[\s\S]*})/);

      console.log("jsonMatch", jsonMatch);

      JSON.parse(openAIResponse);

      isMessageisNotValid = false;
      console.log("isMessageisNotValid", openAIResponse);
      if (chat_id) await addChatMessage(chat_id, openAIResponse, "assistant");
      if (parse) {
        return JSON.parse(openAIResponse);
      }
      return { results: openAIResponse, total_tokens };
    } catch (e) {
      console.log("e", openAIResponse);
      retries++;
      cleanMsgs.push({
        role: "assistant",
        content: openAIResponse,
      });
      cleanMsgs.push({
        role: "user",
        content: `Please provide a JSON resposne only. Remove the text or markdown symbols form this content: '${openAIResponse}' and return only the JSON object.`,
      });
    }
  }

  return {
    error:
      "Engine error, please try to chnage the task or contact support@edgebrix.com",
  };
};

export const sliceIntoChunks = (arr, chunkSize) => {
  return Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );
};
