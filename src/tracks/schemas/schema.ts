import { z } from "zod";

export const CreateTrackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z
    .array(z.string().min(1, "Artist name cannot be empty"))
    .min(1, "At least one artist is required")
    .or(
      z
        .string()
        .min(1, "Artist name cannot be empty")
        .transform((val) => [val]),
    ),
  category: z.string().min(1, "Category is required"),
  audioUrl: z.string().min(1, "audioUrl is required"),
  coverUrl: z.string().min(1, "coverUrl is required"),
});

export type CreateTrackInput = z.infer<typeof CreateTrackSchema>;

export interface Track extends Record<string, unknown> {
  id: string;
  title: string;
  artist: string[];
  category: string;
  audioUrl: string;
  coverUrl: string;
  timestamp: string;
}
