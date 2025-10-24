// encode { createdAt, id } into a compact base64 cursor
export function encodeCursor(createdAt: Date, id: string): string {
  const payload = `${createdAt.toISOString()}::${id}`;
  return Buffer.from(payload).toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const text = Buffer.from(cursor, "base64url").toString("utf8");
  const [iso, id] = text.split("::");
  return { createdAt: new Date(iso), id };
}