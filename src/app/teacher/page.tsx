import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/categories", label: "Categories" },
  { href: "/teacher/questions", label: "Question bank" },
  { href: "/teacher/exams", label: "Exams" },
  { href: "/teacher/students", label: "Students" },
];

const cards = [
  { href: "/teacher/questions", title: "Question bank", desc: "Create and edit questions with rich content." },
  { href: "/teacher/exams", title: "Exams & papers", desc: "Build papers, timing, and review settings." },
  { href: "/teacher/courses", title: "Courses", desc: "Organize courses and link questions." },
  { href: "/teacher/students", title: "Students", desc: "Manage student accounts." },
];

export default function TeacherDashboard() {
  return (
    <AppShell title="Teacher" nav={nav}>
      <PageHeader
        title="Dashboard"
        description="Manage content, exams, and results from one place."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card group transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="card-body">
              <h2 className="font-semibold text-slate-900 group-hover:text-blue-700">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
