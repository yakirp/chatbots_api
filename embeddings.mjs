import { v4 as uuidv4 } from "uuid";
import { sliceIntoChunks } from "./utils.mjs";
import { PineconeClient } from "@pinecone-database/pinecone";

class Embedder {
  pipe = null;
  pinecone = null;
  index = null;
  // Initialize the pipeline
  async init() {
    this.pinecone = new PineconeClient();
    await this.pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });

    this.index = this.pinecone.Index(process.env.PINECONE_INDEX);
    //all-mpnet-base-v2
    const { pipeline } = await import("@xenova/transformers");
    this.pipe = await pipeline("embeddings", "Xenova/all-MiniLM-L6-v2");
  }
  async query(query, namespace = "test", scoreThreshold = 0.5) {
    const queryEmbedding = await this.embed(query);

    // Query the index
    const results = await this.index.query({
      queryRequest: {
        vector: queryEmbedding.values,
        topK: 10,
        includeMetadata: true,
        includeValues: false,
        namespace,
      },
    });

    //reruen array of results >0.5 and also, remove same score results
    const filtered = results.matches.filter((m) => m.score > scoreThreshold);

    filtered.forEach((f) => {
      f.text = f.metadata.text;
      delete f.values;
      delete f.metadata.text;
    });

    return filtered;
  }

  async upsert(text, metadata, namespace = "test") {
    const em = await this.embed(text, { text, ...metadata });
    const tmp = await this.index.upsert({
      upsertRequest: {
        namespace,
        vectors: [em],
      },
    });

    return {
      upsertRequest: {
        namespace,
        vectors: [em],
      },
    };
  }
  // Embed a single string
  async embed(text, metadata = {}) {
    const result = this.pipe && (await this.pipe(text));

    return {
      id: uuidv4(),
      metadata,
      values: Array.from(result.data),
    };
  }

  // Batch an array of string and embed each batch
  // Call onDoneBatch with the embeddings of each batch
  async embedBatch(texts, batchSize, onDoneBatch) {
    const batches = sliceIntoChunks(texts, batchSize);
    for (const batch of batches) {
      const embeddings = await Promise.all(
        batch.map((text) => this.embed(text))
      );
      await onDoneBatch(embeddings);
    }
  }
}

const embedder = new Embedder();

export { embedder };
