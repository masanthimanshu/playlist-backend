import { Router } from "express";
import { storageController } from "./controller.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => storageController.healthCheck(req, res));

export default router;
