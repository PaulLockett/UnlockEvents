// Activities are the building blocks that workflows call.
// Each activity maps to a component operation (E1, E2, E3, R1-R5 calls).

export async function healthCheck(): Promise<string> {
  return `worker healthy at ${new Date().toISOString()}`;
}
