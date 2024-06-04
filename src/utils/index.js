import { promises as fs } from "fs";
import path from "path";

export async function findLuaFiles(dir, fileList = []) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      fileList = await findLuaFiles(filePath, fileList);
    } else if (filePath.endsWith(".lua")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}
