import { pathsToModuleNameMapper } from 'ts-jest';
import type { JestConfigWithTsJest } from 'ts-jest';
// @ts-ignore
import tsConfigJson from './tsconfig.json' with { type: "json" };
const compilerOptions = tsConfigJson.compilerOptions;
const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest',
    transform: {'^.+\\.(ts|tsx)?$': 'ts-jest'},
    testEnvironment: 'node',
    testRegex: '/tests/.*\\.(test|spec)?\\.ts$',
    moduleDirectories: ['node_modules', '<rootDir>'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    roots: ['<rootDir>'],
    modulePaths: [compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: `<rootDir>/${compilerOptions.baseUrl}` }),
    setupFiles: ['dotenv/config'],
}

export default jestConfig;