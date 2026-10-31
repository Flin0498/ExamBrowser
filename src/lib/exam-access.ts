export function studentCanTakeExam(
  exam: { restrictStudents?: boolean },
  enrolledStudentIds: Iterable<string>,
  studentId: string,
): boolean {
  if (!exam.restrictStudents) return true;
  const allowed =
    enrolledStudentIds instanceof Set
      ? enrolledStudentIds
      : new Set(enrolledStudentIds);
  return allowed.has(studentId);
}

export function studentCanTakeExamByMaps(
  examId: string,
  restrictedExamIds: Set<string>,
  enrolledExamIds: Set<string>,
): boolean {
  if (!restrictedExamIds.has(examId)) return true;
  return enrolledExamIds.has(examId);
}
