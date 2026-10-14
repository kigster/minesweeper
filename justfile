set shell := ["bash", "-cu"]

# List recipes
default:
    @just --list

# Install dependencies
install:
    bun install

# Dev server with hot reload (bun ./index.html)
dev:
    bun run dev

# Production-style server on PORT (default 3000)
start:
    bun run start

# Static build into dist/
build:
    bun run build

# Biome + TypeScript type check
lint:
    bun run lint

# Unit tests with coverage (threshold 95%)
test:
    bun run test

# End-to-end: real Bun server + Cypress
e2e:
    bun run e2e
