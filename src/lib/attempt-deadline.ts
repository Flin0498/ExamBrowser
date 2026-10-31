export function getAttemptDeadline(
  startedAt: Date,
  exam: { endAt: Date; timeLimitMinutes: number | null },
): Date {
  const endByExam = exam.endAt.getTime();
  if (exam.timeLimitMinutes && exam.timeLimitMinutes > 0) {
    const endByLimit =
      startedAt.getTime() + exam.timeLimitMinutes * 60 * 1000;
    return new Date(Math.min(endByExam, endByLimit));
  }
  return new Date(endByExam);
}

export function isAttemptPastDeadline(
  startedAt: Date,
  exam: { endAt: Date; timeLimitMinutes: number | null },
  now = new Date(),
): boolean {
  return now.getTime() > getAttemptDeadline(startedAt, exam).getTime();
}
