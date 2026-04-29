export * from "./schemas";
export * from "./session";
export * from "./attribution";
export * from "./transport";
export * from "./sdk/client";
// Não reexportar `./integrations` aqui: inclui Meta CAPI (`node:crypto`) e rebenta o bundle do cliente.
// Importar só em Route Handlers: `@/lib/tracking/integrations`.
