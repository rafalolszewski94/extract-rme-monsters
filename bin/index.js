#!/usr/bin/env node

import { Command } from "commander";
const program = new Command();

import ora from "ora";
import chalk from "chalk";

import { generateMonsterXML } from "../src/lib/monsters.js";
import { generateNpcXML } from "../src/lib/npcs.js";

program.version("1.0.0");

program
  .command("monsters")
  .description("Generate monsters.xml file from all Canary monster .lua files")
  .argument("<dirs...>")
  .action(async (dirs) => {
    const spinner = ora(`Generating monsters.xml file ...`).start();

    try {
      const outputFile = await generateMonsterXML(dirs);
      spinner.succeed(
        console.log(chalk.green(`XML file has been generated at ${outputFile}`))
      );
    } catch (error) {
      spinner.fail(console.log("\n", chalk.red(error)));
    }
  });

program
  .command("npcs")
  .description("Generate npcs.xml file from all Canary monster .lua files")
  .argument("<dirs...>")
  .action(async (dirs) => {
    const spinner = ora(`Generating npcs.xml file ...`).start();

    try {
      const outputFile = await generateNpcXML(dirs);
      spinner.succeed(
        console.log(chalk.green(`XML file has been generated at ${outputFile}`))
      );
    } catch (error) {
      spinner.fail(console.log("\n", chalk.red(error)));
    }
  });

program.parse(process.argv);
