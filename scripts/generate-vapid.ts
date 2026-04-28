import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\n# Copia para .env local e para a Vercel (Environment Variables):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:teu-email@dominio.pt"`);
console.log(`CRON_SECRET="(gere um segredo longo aleatório para o cron)"\n`);
