#!/usr/bin/env node

import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import chalk from "chalk";

// Function to recursively find .lua files in the directory
function findLuaFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findLuaFiles(filePath, fileList);
    } else if (filePath.endsWith(".lua")) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Function to extract mType and outfit data from a .lua file
function extractMonsterData(filePath) {
  const data = fs.readFileSync(filePath, "utf8");

  // Remove Lua comments from the file
  const filteredData = data.replace(/--.*(?:\n|$)/g, "");

  const mTypeMatch = filteredData.match(/Game\.createMonsterType\("([^"]+)"\)/);
  const outfitMatch = filteredData.match(/monster\.outfit\s*=\s*{([^}]+)}/);

  if (!mTypeMatch || !outfitMatch) {
    console.log(
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
    delete outfit.looktypeex;
    outfit["looktype"] = "0";
  }

  // Ensure looktype is set, default to 0 if not found
  if (!("looktype" in outfit)) {
    outfit["looktype"] = "0";
  }

  console.log(
    chalk.green(
      `Extracted monster: ${name} with outfit: ${JSON.stringify(outfit)}`
    )
  );
  return { name, outfit };
}

// Function to merge monsters from multiple directories and remove duplicates
function mergeAndDeduplicateMonsters(dirs) {
  const allMonsters = new Map(); // Using a Map to automatically handle deduplication
  dirs.forEach((dir) => {
    const luaFiles = findLuaFiles(dir);
    luaFiles.forEach((file) => {
      const monsterData = extractMonsterData(file);
      if (monsterData) {
        allMonsters.set(monsterData.name, monsterData);
      }
    });
  });
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
function generateMonsterXML(inputDirs, outputFile) {
  const monsters = mergeAndDeduplicateMonsters(inputDirs);

  if (monsters.length === 0) {
    console.error(
      chalk.red("No monsters found. XML file will not be created.")
    );
    return;
  }

  const xml = createXML(monsters);
  fs.writeFileSync(outputFile, xml, "utf8");
  console.log(chalk.blue(`XML file has been generated at ${outputFile}`));
}

// Example usage
const inputDirs = process.argv.slice(2);
const outputFile = "monsters.xml";

if (inputDirs.length === 0) {
  console.error(
    chalk.red(
      "Please provide at least one input directory as a command line argument."
    )
  );
  process.exit(1);
}

generateMonsterXML(inputDirs, outputFile);
