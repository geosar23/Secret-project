import multer from "multer";
import { BadRequestError } from "../utils/app-error.util";

const MAX_PROFILE_IMAGE_SIZE_MB = 5;
const MAX_DOCUMENT_SIZE_MB = 10;

export const uploadProfileImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PROFILE_IMAGE_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new BadRequestError("Only image files are allowed"));
            return;
        }
        cb(null, true);
    },
});

const ALLOWED_DOCUMENT_MIMETYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

export const uploadDocument = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_DOCUMENT_MIMETYPES.has(file.mimetype)) {
            cb(new BadRequestError("Only PDF or image files are allowed for documents"));
            return;
        }
        cb(null, true);
    },
});
