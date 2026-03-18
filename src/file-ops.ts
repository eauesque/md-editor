import { open, save } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { t } from "./i18n";

const getMdFilters = () => [
  { name: t("file.markdown"), extensions: ["md", "markdown", "txt"] },
  { name: t("file.allFiles"), extensions: ["*"] },
];

export async function openFile(): Promise<{
  path: string;
  content: string;
} | null> {
  const selected = await open({
    multiple: false,
    filters: getMdFilters(),
  });
  if (!selected) return null;
  const path = selected as string;
  const content = await readTextFile(path);
  return { path, content };
}

export async function saveFile(
  content: string,
  filePath: string
): Promise<string | null> {
  await writeTextFile(filePath, content);
  return filePath;
}

export async function saveFileAs(content: string): Promise<string | null> {
  const path = await save({
    filters: getMdFilters(),
  });
  if (!path) return null;
  await writeTextFile(path, content);
  return path;
}
