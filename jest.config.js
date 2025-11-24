module.exports = {
    // Entorno de pruebas (Node.js para backend)
    testEnvironment: 'node',

    // Activar recolección de cobertura
    collectCoverage: true,

    // Archivos de los cuales recolectar cobertura
    collectCoverageFrom: [
        'src/**/*.js',
        'server.js',
        '!src/**/*.test.js',
        '!**/node_modules/**',
        '!**/coverage/**'
    ],

    // Directorio donde se guardará el reporte de cobertura
    coverageDirectory: 'coverage',

    // Tipos de reportes de cobertura
    coverageReporters: [
        'lcov',     // Para lcov.info (usado por herramientas CI/CD)
        'text',     // Para ver en consola
        'html',     // Para ver en navegador
        'json'      // Para análisis programático
    ],

    // Umbrales de cobertura (opcional, útil para CI/CD)
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 80,
            statements: 80
        }
    },

    // Directorios donde buscar tests
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Tiempo máximo por test (en ms)
    testTimeout: 10000,

    // Mostrar detalles de cada test
    verbose: true,

    // Limpiar mocks automáticamente entre tests
    clearMocks: true,

    // Restaurar mocks automáticamente entre tests
    restoreMocks: true,

    // Transformaciones (si necesitas Babel o TypeScript)
    // transform: {
    //   '^.+\\.js$': 'babel-jest'
    // },

    // Ignorar archivos
    testPathIgnorePatterns: [
        '/node_modules/',
        '/public/',
        '/coverage/'
    ],

    // Setup files (si necesitas configuración global)
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};