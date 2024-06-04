import { promises as fs } from "fs";
import xml2js from "xml2js";
import chalk from "chalk";
import { findLuaFiles } from "../utils/index.js";

// Function to extract mType and outfit data from a .lua file
async function extractMonsterData(filePath) {
  const data = await fs.readFile(filePath, "utf8");

  // Remove Lua comments from the file
  const filteredData = data.replace(/--.*(?:\n|$)/g, "");

  const mTypeMatch = filteredData.match(/Game\.createMonsterType\("([^"]+)"\)/);
  const outfitMatch = filteredData.match(/monster\.outfit\s*=\s*{([^}]+)}/);

  if (!mTypeMatch || !outfitMatch) {
    console.log(
      "\n",
      chalk.yellow(`No valid mType or outfit found in file: ${filePath}`)
    );
    return null;
  }

  const name = mTypeMatch[1];
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
  //     `Extracted monster: ${name} with outfit: ${JSON.stringify(outfit)}`
  //   )
  // );
  return { name, outfit };
}

// Function to merge monsters from multiple directories and remove duplicates
async function mergeAndDeduplicateMonsters(dirs) {
  const allMonsters = new Map(); // Using a Map to automatically handle deduplication

  for (const dir of dirs) {
    const luaFiles = await findLuaFiles(dir);
    for (const file of luaFiles) {
      const monsterData = await extractMonsterData(file);
      if (monsterData) {
        allMonsters.set(monsterData.name, monsterData);
      }
    }
  }
  return [...allMonsters.values()];
}

// Function to create XML structure from monster data
function createXML(monsters) {
  // Sort monsters alphabetically by name
  monsters.sort((a, b) => a.name.localeCompare(b.name));

  const builder = new xml2js.Builder({ headless: false, rootName: "monsters" });
  const xmlObject = {
    monster: monsters
      .map((monster) => {
        try {
          const attrs = { name: monster.name, ...monster.outfit };
          return { $: attrs };
        } catch (error) {
          console.error(
            "\n",
            chalk.red(
              `Error creating XML for monster ${chalk.bold(monster.name)}: ${
                error.message
              }`
            )
          );
          return null;
        }
      })
      .filter((monster) => monster !== null),
  };
  return builder.buildObject(xmlObject);
}

// Main function to process the directories and generate the XML
export async function generateMonsterXML(
  inputDirs,
  outputFile = "monsters.xml"
) {
  const monsters = await mergeAndDeduplicateMonsters(inputDirs);

  if (monsters.length === 0) {
    throw Error("No monsters found. XML file will not be created.");
  }

  const xml = createXML(monsters);
  await fs.writeFile(outputFile, xml, "utf8");

  return outputFile;
}
