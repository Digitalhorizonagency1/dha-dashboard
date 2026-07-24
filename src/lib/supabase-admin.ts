import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase utilisant la clé service_role.
 *
 * IMPORTANT :
 * - Ce fichier importe "server-only", ce qui fait échouer le build si jamais
 *   il est importé par erreur depuis un composant client. C'est une protection
 *   supplémentaire en plus de la convention Next.js (le code ici ne tourne
 *   jamais dans le navigateur).
 * - La clé service_role bypass RLS : ne l'utilisez que pour des opérations
 *   admin contrôlées (ce dashboard), jamais exposée au client.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL manquante. Vérifiez votre fichier .env.local."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY manquante. Vérifiez votre fichier .env.local. " +
      "Ne jamais utiliser la clé anon à la place : le dashboard a besoin de " +
      "bypasser RLS pour écrire dans catalogue_articles."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
