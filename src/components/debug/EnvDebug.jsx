import { useEffect } from 'react';

/**
 * Debug component to check environment variables at runtime
 * This helps diagnose Vercel deployment issues
 */
export default function EnvDebug() {
  useEffect(() => {
    console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
    console.log("All VITE_ env vars:", Object.keys(import.meta.env)
      .filter(k => k.startsWith('VITE_'))
      .reduce((acc, key) => {
        const value = import.meta.env[key];
        acc[key] = value ? `${value.substring(0, 20)}... (length: ${value.length})` : 'NOT SET';
        return acc;
      }, {}));
    
    console.log("VITE_DYNAMIC_ENV_ID specifically:", {
      exists: !!import.meta.env.VITE_DYNAMIC_ENV_ID,
      value: import.meta.env.VITE_DYNAMIC_ENV_ID || 'NOT SET',
      length: import.meta.env.VITE_DYNAMIC_ENV_ID?.length || 0,
      type: typeof import.meta.env.VITE_DYNAMIC_ENV_ID,
    });
    
    console.log("import.meta.env object:", import.meta.env);
    console.log("=== END DEBUG ===");
  }, []);

  return null; // This component doesn't render anything
}



