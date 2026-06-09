import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "..");
const routesFile = path.join(projectRoot, "src", "app", "app.routes.ts");

const requiredPaths = ["non-authorized", "levels", "offices"];

function fail(message: string): never {
    console.error(`Route check failed: ${message}`);
    process.exit(1);
}

if (!fs.existsSync(routesFile)) {
    fail(`Could not find routes file at ${routesFile}`);
}

const content = fs.readFileSync(routesFile, "utf8");

const missing = requiredPaths.filter(routePath => {
    const regex = new RegExp(`path\\s*:\\s*["']${routePath}["']`, "m");
    return !regex.test(content);
});

if (missing.length > 0) {
    fail(`Missing required route(s): ${missing.join(", ")}`);
}

console.log("Route check passed: all required routes are present.");
