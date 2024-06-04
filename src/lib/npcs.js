import { promises as fs } from "fs";
import xml2js from "xml2js";
import chalk from "chalk";
import { findLuaFiles } from "../utils/index.js";

// Function to extract mType and outfit data from a .lua file
async function extractNpcData(filePath) {
  const data = await fs.readFile(filePath, "utf8");

  // Remove Lua comments from the file
  const filteredData = data.replace(/--.*(?:\n|$)/g, "");

  const npcTypeMatch = filteredData.match(
    /Game\.createNpcType\("([^"]+)"\)|local internalNpcName = "([^"]+)"/
  );
  const outfitMatch = filteredData.match(/npcConfig\.outfit\s*=\s*{([^}]+)}/);

  if (!npcTypeMatch || !outfitMatch) {
    console.log(
      "\n",
      chalk.yellow(`No valid npcTyp or outfit found in file: ${filePath}`)
    );
    return null;
  }

  const name = npcTypeMatch[1] || npcTypeMatch[2];
  const outfitStr = outfitMatch[1];
  const outfit = {};

  // Parse the outfit string and convert keys to lowercase
  outfitStr.split(",").forEach((part) => {
    const [key, value] = part.split("=").map((s) => s.trim());

    // Check for commented-out looktype and set looktype to 0
    if (key.toLowerCase() === "--looktype") {
      outfit["looktype"] = "0";
    } else {
      outfit[key.toLowerCase()] = value;
    }
  });

  // Check for looktypeex and set looktype to 0 if it exists
  if ("looktypeex" in outfit) {
    outfit["lookitem"] = outfit.looktypeex;
    delete outfit.looktypeex;
    outfit["looktype"] = "0";
  }

  // Ensure looktype is set, default to 0 if not found
  if (!("looktype" in outfit)) {
    outfit["looktype"] = "0";
  }

  // console.log(
  //   chalk.green(
  //     `Extracted npc: ${name} with outfit: ${JSON.stringify(outfit)}`
  //   )
  // );
  return { name, outfit };
}

// Function to merge npcs from multiple directories and remove duplicates
async function mergeAndDeduplicateNpcs(dirs) {
  const allNpcs = new Map(); // Using a Map to automatically handle deduplication

  for (const dir of dirs) {
    const luaFiles = await findLuaFiles(dir);
    for (const file of luaFiles) {
      const npcData = await extractNpcData(file);
      if (npcData) {
        allNpcs.set(npcData.name, npcData);
      }
    }
  }
  return [...allNpcs.values()];
}

// Function to create XML structure from npc data
function createXML(npcs) {
  // Sort npcs alphabetically by name
  npcs.sort((a, b) => a.name.localeCompare(b.name));

  const builder = new xml2js.Builder({ headless: false, rootName: "npcs" });
  const xmlObject = {
    npc: npcs
      .map((npc) => {
        try {
          const attrs = { name: npc.name, ...npc.outfit };
          return { $: attrs };
        } catch (error) {
          console.error(
            "\n",
            chalk.red(
              `Error creating XML for npc ${chalk.bold(npc.name)}: ${
                error.message
              }`
            )
          );
          return null;
        }
      })
      .filter((npc) => npc !== null),
  };
  return builder.buildObject(xmlObject);
}

// Main function to process the directories and generate the XML
export async function generateNpcXML(inputDirs, outputFile = "npcs.xml") {
  const npcs = await mergeAndDeduplicateNpcs(inputDirs);

  if (npcs.length === 0) {
    throw Error("No npcs found. XML file will not be created.");
  }

  const xml = createXML(npcs);
  await fs.writeFile(outputFile, xml, "utf8");

  return outputFile;
}
