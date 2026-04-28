/**
 * Copia local-credentials/secrets.env -> .env.local na raiz do projeto.
 * Uso: npm run env:sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "local-credentials", "secrets.env");
const dst = path.join(root, ".env.local");

if (!fs.existsSync(src)) {
  console.error(
    "Falta local-credentials/secrets.env\n" +
      "  Copia local-credentials/secrets.example.env para secrets.env e preenche.",
  );
  process.exit(1);
}

fs.copyFileSync(src, dst);
console.log("OK: copiado local-credentials/secrets.env -> .env.local");
console.log("    Reinicia o servidor de desenvolvimento (npm run dev).");
