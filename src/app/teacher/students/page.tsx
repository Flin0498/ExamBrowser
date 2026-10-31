import { AppShell } from "@/components/app-shell";
import { StudentDeleteButton } from "@/components/student-delete-button";
import { StudentQuickEdit } from "@/components/student-quick-edit";
import { prisma } from "@/lib/db";
import { createStudent } from "@/app/actions/teacher";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/students", label: "Students" },
  { href: "/teacher/exams", label: "Exams" },
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const classFilter = sp.class?.trim();
  const q = sp.q?.trim();

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(classFilter ? { classGroup: classFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { studentNo: { contains: q, mode: "insensitive" } },
              { classGroup: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ classGroup: "asc" }, { studentNo: "asc" }, { name: "asc" }],
  });

  const classGroups = await prisma.user.findMany({
    where: { role: "STUDENT", classGroup: { not: null } },
    select: { classGroup: true },
    distinct: ["classGroup"],
    orderBy: { classGroup: "asc" },
  });

  return (
    <AppShell title="Students" nav={nav}>
      <p className="page-desc mb-6">
        Manage student accounts. Student ID (学号) and class (班别) appear in the gradebook and CSV export.
      </p>

      <section className="card mb-6">
        <div className="card-body">
          <h2 className="font-semibold text-slate-900">Add student</h2>
          <form
            action={async (fd) => {
              "use server";
              await createStudent(
                String(fd.get("username")),
                String(fd.get("name")),
                String(fd.get("password")),
                String(fd.get("studentNo") || ""),
                String(fd.get("classGroup") || ""),
              );
            }}
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="text-sm">
              <span className="label">Student ID (学号)</span>
              <input name="studentNo" placeholder="20240001" className="input mt-1" />
            </label>
            <label className="text-sm">
              <span className="label">Class (班别)</span>
              <input name="classGroup" placeholder="CS-370-A" className="input mt-1" />
            </label>
            <label className="text-sm">
              <span className="label">Full name</span>
              <input name="name" required placeholder="Zhang San" className="input mt-1" />
            </label>
            <label className="text-sm">
              <span className="label">Username (login)</span>
              <input name="username" required placeholder="zhangsan" className="input mt-1" />
            </label>
            <label className="text-sm">
              <span className="label">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="input mt-1"
              />
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button type="submit" className="btn-primary w-full sm:w-auto">Add student</button>
            </div>
          </form>
        </div>
      </section>

      <form method="get" className="card mb-4">
        <div className="card-body flex flex-wrap items-end gap-3">
          <label className="min-w-[10rem] flex-1 text-sm">
            <span className="label">Search</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, username, 学号, class…"
              className="input mt-1"
            />
          </label>
          <label className="min-w-[8rem] text-sm">
            <span className="label">Class filter</span>
            <select name="class" defaultValue={classFilter ?? ""} className="input mt-1">
              <option value="">All classes</option>
              {classGroups.map((c) => (
                <option key={c.classGroup!} value={c.classGroup!}>{c.classGroup}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-secondary">Filter</button>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-600">{students.length} student(s)</p>

      {students.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-sm text-slate-600">No students match your filters.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Class</th>
                <th>Name</th>
                <th>Username</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-slate-700">{s.studentNo ?? "—"}</td>
                  <td className="text-slate-600">{s.classGroup ?? "—"}</td>
                  <td className="font-medium">{s.name}</td>
                  <td className="text-slate-600">{s.username}</td>
                  <td className="text-right align-top">
                    <div className="flex flex-col items-end gap-1">
                      <StudentQuickEdit
                        studentId={s.id}
                        username={s.username}
                        name={s.name}
                        studentNo={s.studentNo}
                        classGroup={s.classGroup}
                      />
                      <StudentDeleteButton studentId={s.id} label={s.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
