/** Test stub — pure compute functions under test never invoke the DB client. */
export async function createClient() {
  throw new Error("createClient() should not be called in unit tests (pure logic only).");
}
