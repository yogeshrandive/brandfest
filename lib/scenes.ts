import fs from "fs";
import path from "path";
import type { SceneDefinition } from "./types";

const SCENES_DIR = path.join(process.cwd(), "config", "scenes");

export function loadScenes(): SceneDefinition[] {
  if (!fs.existsSync(SCENES_DIR)) return [];
  return fs
    .readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SCENES_DIR, f), "utf-8")) as SceneDefinition);
}

export function loadScene(id: string): SceneDefinition | null {
  const file = path.join(SCENES_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as SceneDefinition;
}
