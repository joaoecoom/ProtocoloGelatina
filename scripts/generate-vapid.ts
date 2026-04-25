import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
// eslint-disable-next-line no-console
console.log("\n# Copia para .env local e para a Vercel (Environment Variables):\n");
// eslint-disable-next-line no-console
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
// eslint-disable-next-line no-console
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
// eslint-disable-next-line no-console
console.log(`VAPID_SUBJECT="mailto:teu-email@dominio.pt"`);
// eslint-disable-next-line no-console
console.log(`CRON_SECRET="(gere um segredo longo aleatório para o cron)"\n`);
