import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function envValue(env: Record<string, string>, name: string): string | undefined {
  return env[name] ?? process.env[name];
}

function validateBuildEnv(env: Record<string, string>, mode: string): void {
  const appEnv = envValue(env, 'VITE_ABEL_APP_ENV') || (mode === 'production' ? 'production' : 'development');
  const betaEnabled = envValue(env, 'VITE_ABEL_BETA_ENABLED') === 'true';
  const inviteCodes = envValue(env, 'VITE_ABEL_INVITE_CODES') || '';

  if (betaEnabled && appEnv === 'production' && inviteCodes.trim().length === 0) {
    throw new Error('VITE_ABEL_BETA_ENABLED=true requires VITE_ABEL_INVITE_CODES for production builds');
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  validateBuildEnv(env, mode);
  const release = env.VITE_ABEL_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'local';

  return {
    plugins: [react()],
    define: {
      __ABEL_RELEASE__: JSON.stringify(release),
    },
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1200,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
  };
})
