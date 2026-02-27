import type { SupabaseClient } from "@supabase/supabase-js";

export interface Storage {
  upload(path: string, data: unknown): Promise<void>;
  download(path: string): Promise<unknown>;
}

export function createStorage(client: SupabaseClient, bucket: string): Storage {
  return {
    async upload(path: string, data: unknown): Promise<void> {
      const body = JSON.stringify(data);
      const { error } = await client.storage
        .from(bucket)
        .upload(path, body, { contentType: "application/json", upsert: true });
      if (error) {
        throw new Error(`Storage upload failed at ${path}: ${error.message}`);
      }
    },

    async download(path: string): Promise<unknown> {
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error) {
        throw new Error(`Storage download failed at ${path}: ${error.message}`);
      }
      const text = await data.text();
      return JSON.parse(text) as unknown;
    },
  };
}
