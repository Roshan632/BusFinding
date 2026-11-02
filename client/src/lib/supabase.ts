import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function uploadDocument(file: File, folder: string) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your client .env file and create a public 'documents' bucket."
    );
  }

  const safeName = file.name.replace(/\s+/g, "-").replace(/[\\/]+/g, "-");
  const path = `${folder}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error || !data?.path) {
    throw new Error(error?.message || "Could not upload the document.");
  }

  return `${supabaseUrl}/storage/v1/object/public/documents/${data.path}`;
}
