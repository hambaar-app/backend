/**
 * Shared test fixtures barrel.
 *
 * Fixtures are pure factory functions returning fresh objects per call — never
 * mutate the module-level constants (mockUser, mockSession, …) inside tests;
 * create a new one with the factory and overrides instead.
 */
export * from './user.fixture';
export * from './session.fixture';
export * from './location.fixture';
