![NPM Version](https://img.shields.io/npm/v/extract-rme-monsters)

# Extract RME monsters to XML

This CLI takes 1, 2 or more directories of monsters from Canary, and genrates [monsters.xml](https://github.com/opentibiabr/remeres-map-editor/blob/main/data/creatures/monsters.xml) file for usage with [Remeres Map Editor](https://github.com/opentibiabr/remeres-map-editor/tree/main)

## Installation

Globally

```
npm i -G extract-rme-monsters
```

Locally

```
npm i extract-rme-monsters
```

## Usage

Single directory

```bash
generate-monsters-rme-xml /my-ot/data-otservbr-global/monster
```

Multiple directories

```bash
generate-monsters-rme-xml /my-ot/data-otservbr-global/monster /my-ot/data-canary/monster
```