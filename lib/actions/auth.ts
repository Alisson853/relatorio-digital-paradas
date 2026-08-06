"use server";

export async function verifyEditorPassword(senha: string): Promise<boolean> {
  return senha === process.env.EDITOR_PASSWORD;
}
