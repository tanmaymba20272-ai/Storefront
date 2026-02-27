/** Jest config using ts-jest to support TypeScript and JSX in tests */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^next/image$': '<rootDir>/__mocks__/next/image.js',
    '^next/link$': '<rootDir>/__mocks__/next/link.js',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
    '^.*lib/supabaseClient$': '<rootDir>/__mocks__/lib/supabaseClient.js',
    '^server-only$': '<rootDir>/__mocks__/server-only.js',
    '^store/(.*)$': '<rootDir>/store/$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!(isomorphic-dompurify|dompurify)/)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
}
