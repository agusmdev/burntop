import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: 'http://localhost:8000/openapi.json',
    },
    output: {
      target: './src/api/generated.ts',
      client: 'react-query',
      mode: 'tags-split',
      httpClient: 'fetch',
      tsconfig: './tsconfig.json',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
