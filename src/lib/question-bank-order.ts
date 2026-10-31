import { prisma } from "@/lib/db";

/** Next sortOrder values for new questions (file order = ascending on the bank page). */
export async function allocateQuestionSortOrders(
  ownerId: string,
  count: number,
): Promise<number[]> {
  if (count <= 0) return [];
  const max = await prisma.question.aggregate({
    where: { ownerId },
    _max: { sortOrder: true },
  });
  let next = (max._max.sortOrder ?? -1) + 1;
  return Array.from({ length: count }, () => next++);
}
