import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { createCategory } from "@/app/actions/teacher";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/categories", label: "Categories" },
  { href: "/teacher/questions", label: "Question bank" },
];

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <AppShell title="Categories" nav={nav}>
      <form
        action={async (fd) => {
          "use server";
          await createCategory(String(fd.get("name")));
        }}
        className="mb-6 flex gap-2 rounded border bg-white p-4"
      >
        <input name="name" required placeholder="Category name" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Add</button>
      </form>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="rounded border bg-white px-4 py-3 font-medium">{c.name}</li>
        ))}
      </ul>
    </AppShell>
  );
}
