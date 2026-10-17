import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(configDirectory, "../../../.env"),
});

dotenv.config({
  path: path.resolve(configDirectory, "../../.env"),
});
