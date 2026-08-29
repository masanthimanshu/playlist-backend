import { Router } from "express";
import { validateData } from "#core/validator.js";
import { storageController } from "../controllers/controller.js";
import { UploadUrlSchema } from "../schemas/schema.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => storageController.healthCheck(req, res));

// Presigned URL generation for S3 direct uploads
router.post(
  "/upload-url",
  validateData(UploadUrlSchema),
  (req, res) => void storageController.getUploadUrl(req, res),
);

export default router;
