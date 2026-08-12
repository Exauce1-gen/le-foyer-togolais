/* ==========================================================================
   SUPABASE-CONFIG.JS
   Configuration partagée entre le site public (filters.js, gallery.js) et
   l'espace admin (admin.js). L'URL et la clé "anon" ci-dessous sont conçues
   pour être publiques (visibles dans le code du site) : la vraie protection
   se fait via les règles RLS définies dans Supabase, pas en cachant ces
   valeurs. Ne jamais mettre la clé "service_role" ici.
   ========================================================================== */

const SUPABASE_URL = 'https://bqmkuprudbgmmgjobaas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbWt1cHJ1ZGJnbW1nam9iYWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Njg3MjksImV4cCI6MjEwMjA0NDcyOX0._Ugkda0DL8g2OQyqOFUrfMfy3cGdgVatAYrK_90d5ns';
