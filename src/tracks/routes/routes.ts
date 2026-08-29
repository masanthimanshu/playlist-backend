import { Router } from "express";
import { validateData } from "#core/validator.js";
import { tracksController } from "../controllers/controller.js";
import { CreateTrackSchema } from "../schemas/schema.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => tracksController.healthCheck(req, res));

// Get all tracks from DynamoDB
router.get("/get-tracks", (req, res) => void tracksController.getTracks(req, res));

// Get track by ID from DynamoDB
router.get("/:id", (req, res) => void tracksController.getTrackById(req, res));

// Create new track in DynamoDB
router.post(
  "/create-track",
  validateData(CreateTrackSchema),
  (req, res) => void tracksController.createTrack(req, res),
);

// Delete track from DynamoDB
router.delete("/:id", (req, res) => void tracksController.deleteTrack(req, res));

export default router;
