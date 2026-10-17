
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

if (!ffmpegPath) {
  throw new Error("FFmpeg executable was not found.");
}

ffmpeg.setFfmpegPath(ffmpegPath);

export async function extractVideoFrames(videoPath) {
  const outputDirectory = path.join(
    path.dirname(videoPath),
    `frames-${randomUUID()}`
  );

  await fs.mkdir(outputDirectory, { recursive: true });

  const outputPattern = path.join(
    outputDirectory,
    "frame-%03d.jpg"
  );

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          "-vf",
          "fps=1/2,scale=1280:-2",
          "-frames:v",
          "30",
        ])
        .output(outputPattern)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const names = (await fs.readdir(outputDirectory))
      .filter((name) => /^frame-\d+\.jpg$/i.test(name))
      .sort();

    if (names.length === 0) {
      throw new Error("No frames could be extracted from this video.");
    }

    return {
      directory: outputDirectory,
      frames: names.map((name) => ({
        path: path.join(outputDirectory, name),
        originalname: name,
        mimetype: "image/jpeg",
      })),
    };
  } catch (error) {
    await fs.rm(outputDirectory, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}
