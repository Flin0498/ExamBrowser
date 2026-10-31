import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { createCourse, deleteCourse } from "@/app/actions/teacher";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/questions", label: "Question bank" },
  { href: "/teacher/exams", label: "Exams" },
];

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });
  return (
    <AppShell title="Courses" nav={nav}>
      <form
        action={async (fd) => {
          "use server";
          await createCourse(String(fd.get("name")), String(fd.get("description") || ""));
        }}
        className="mb-6 flex flex-wrap gap-2 rounded border bg-white p-4"
      >
        <input name="name" required placeholder="Course name" className="rounded border px-3 py-2" />
        <input name="description" placeholder="Description" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Add</button>
      </form>
      <ul className="space-y-2">
        {courses.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded border bg-white px-4 py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              {c.description && <p className="text-sm text-slate-600">{c.description}</p>}
            </div>
            <form
              action={async () => {
                "use server";
                await deleteCourse(c.id);
              }}
            >
              <button type="submit" className="text-sm text-red-600">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
