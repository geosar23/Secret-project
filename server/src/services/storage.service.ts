import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env";

const PROFILE_IMAGE_URL_TTL_SECONDS = 60 * 60; // 1 hour

const ensureStorageConfig = () => {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY || !config.SUPABASE_STORAGE_BUCKET) {
        throw new Error(
            "Supabase storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET",
        );
    }
};

const getSupabaseClient = () => {
    ensureStorageConfig();
    const url = config.SUPABASE_URL;
    const key = config.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Supabase URL and Service Role Key must be set in environment variables");
    }
    const client = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    return client;
};

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");

export const StorageService = {
    getBucketName: (): string => {
        ensureStorageConfig();
        const bucket = config.SUPABASE_STORAGE_BUCKET;
        if (!bucket) {
            throw new Error("Supabase storage bucket must be set in environment variables");
        }

        return bucket;
    },

    uploadUserProfileImage: async (params: {
        companyId: string;
        userId: string;
        fileBuffer: Buffer;
        originalName: string;
        mimeType: string;
    }) => {
        const bucket = StorageService.getBucketName();
        const supabase = getSupabaseClient();

        const safeName = sanitizeFileName(params.originalName);
        const path = `${params.companyId}/users/${params.userId}/profile-image/${safeName}`;

        const response = await supabase.storage.from(bucket).upload(path, params.fileBuffer, {
            contentType: params.mimeType,
            upsert: false,
        });

        if (response.error) {
            throw new Error(`Supabase upload failed: ${response.error.message}`);
        }

        return { bucket, path };
    },

    createSignedUrl: async (path: string, expiresIn = PROFILE_IMAGE_URL_TTL_SECONDS) => {
        const bucket = StorageService.getBucketName();
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || "Failed to create signed image URL");
        }

        return { url: data.signedUrl, expiresIn };
    },

    removeFile: async (path: string) => {
        const bucket = StorageService.getBucketName();
        const supabase = getSupabaseClient();

        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) {
            throw new Error(`Supabase remove failed: ${error.message}`);
        }
    },
};
