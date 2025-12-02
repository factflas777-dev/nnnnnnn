import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessFaceRequest {
  user_id: string;
  raw_path: string;
  upload_id: string;
  face_meta?: {
    scale?: number;
    rotation?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, raw_path, upload_id, face_meta }: ProcessFaceRequest = await req.json();

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("user-faces")
      .download(raw_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const mimeType = fileData.type;
    const fileSize = fileData.size;

    if (fileSize > 5 * 1024 * 1024) {
      await supabase.from("face_upload_logs").update({
        outcome: "rejected",
        reason: "File size exceeds 5MB limit",
      }).eq("upload_id", upload_id);

      return new Response(
        JSON.stringify({ ok: false, error: "File size exceeds 5MB limit" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimeType)) {
      await supabase.from("face_upload_logs").update({
        outcome: "rejected",
        reason: "Invalid file type. Only JPG, PNG, and WebP allowed.",
      }).eq("upload_id", upload_id);

      return new Response(
        JSON.stringify({ ok: false, error: "Invalid file type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("face_version")
      .eq("user_id", user_id)
      .maybeSingle();

    const newVersion = (profile?.face_version || 0) + 1;
    const processedPath = `faces/${user_id}/${newVersion}.webp`;

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("user-faces")
      .upload(processedPath, uint8Array, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload processed file: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("user-faces")
      .getPublicUrl(processedPath);

    const face_url = urlData.publicUrl;

    const meta = {
      width: 512,
      height: 512,
      scale: face_meta?.scale || 1.0,
      rotation: face_meta?.rotation || 0,
      offsetX: face_meta?.offsetX || 0,
      offsetY: face_meta?.offsetY || 0,
    };

    await supabase
      .from("profiles")
      .update({
        face_path: processedPath,
        face_url: face_url,
        face_version: newVersion,
        face_state: "approved",
        face_meta: meta,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    await supabase
      .from("face_upload_logs")
      .update({
        processed_path: processedPath,
        outcome: "accepted",
        file_size: fileSize,
        mime_type: mimeType,
      })
      .eq("upload_id", upload_id);

    return new Response(
      JSON.stringify({
        ok: true,
        face_url,
        face_version: newVersion,
        state: "approved",
        meta,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing face:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});