# ExamBrowser

![Next.js](https://img.shields.io/badge/Next.js-16-3776ab?style=flat-square&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-555?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2a4a6b?style=flat-square)
![Auth](https://img.shields.io/badge/Auth-Auth.js-0b6?style=flat-square)

[English](#english) | [简体中文](#简体中文)

---



## English

### 1. Abstract

ExamBrowser is a **local / campus exam platform** (Next.js + PostgreSQL):

- Teachers maintain a **question bank**, build **papers**, schedule exams, and grade
- Students **sign in**, sit assigned exams, and review submitted attempts
- Seed data only contains **demo accounts and 3 sample questions** — not a real course bank

**Question types**

| Type | Use |
|------|-----|
| Single / multiple choice | A–D (or more) options; optional figures |
| True / False | Two options |
| Fill in the blank | Inline blanks with accepted answers |
| Matching slots | Drag / pick labels into slots |

**Typical use:** mid-term practice, closed-book quizzes, import from PDF/DOCX/CSV/JSON.

### 2. Project Structure

```
ExamBrowser/
├─ src/
│  ├─ app/                 # Routes: login, teacher, student, APIs
│  ├─ components/          # Paper editor, attempt UI, rich editor
│  └─ lib/                 # Auth, grading, import, enrollment
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts              # Demo teacher + 2 students + 3 sample questions
├─ public/
│  ├─ templates/           # CSV / JSON import templates
│  └─ uploads/.gitkeep     # Upload dir only (no exam figures in git)
├─ docker-compose.yml      # Local PostgreSQL
├─ .env.example
└─ README.md
```

### 3. Quick Start

Requires **Docker Desktop** (running) and **Node.js 20+**.

#### 3.1 First-time setup

```bash
git clone https://github.com/Flin0498/ExamBrowser.git
cd ExamBrowser
docker compose up -d
cp .env.example .env
```

Open `.env` in a text editor. It has three lines. Change **only** these two:

`AUTH_SECRET` — login-session signing key. Replace the placeholder `change-me-to-a-long-random-string` with a new random value (32+ characters). Generate one, then paste it:

```bash
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

# macOS / Linux
openssl rand -base64 32
```

Example after edit:

```env
AUTH_SECRET="k8Qm2nR4pX...your-own-string...9fL"
```

Leave it as the placeholder and sign-in cookies will be insecure (and may break if two people share the same default).

`NEXTAUTH_URL` — leave `http://localhost:xxx` for now. You will replace `xxx` after `npm run dev` prints the real port.

Then:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

The terminal prints something like `Local: http://localhost:3000` or `http://localhost:3001`. That number is `xxx`.

1. Open that exact URL in the browser.
2. Edit `.env`: set `NEXTAUTH_URL="http://localhost:3000"` (or `3001`, whatever was printed).
3. Stop the server (`Ctrl+C`) and run `npm run dev` again so Auth.js picks up the new URL.

`npm run db:seed` **wipes** users / questions / exams and reloads demo data. Use it only on a fresh database.

#### 3.2 Later starts (database already set up)

Do **not** copy `.env` again, and do **not** run `db:push` / `db:seed` unless you intend to reset.

```bash
cd ExamBrowser
docker compose up -d
npm run dev
```

Open the URL Next prints (`http://localhost:xxx`). If that port is the same as last time, `.env` needs no change. If Next picked a **new** port (e.g. `3000` taken by another app), update `NEXTAUTH_URL` to match and restart `npm run dev`.

Stop the site with `Ctrl+C`. Postgres can stay up (`docker compose up -d` is enough next time). To stop the database as well: `docker compose stop`.

### 4. User Guide

#### 4.1 Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Teacher | `teacher` | `teacher123` |
| Student | `student1` | `student123` |
| Student | `student2` | `student123` |

These are **public demo accounts**. Real student numbers, class groups, and course banks stay in your local database and must not be committed.

#### 4.2 Teacher

| Area | What you can do |
|------|-----------------|
| Courses / categories | Create courses and tags; attach questions |
| Question bank | Create / edit / delete; rich stem (text, images, KaTeX); filters; reorder |
| Import | `.json` / `.csv` / `.docx` / `.pdf` / `.txt`; red-highlighted PDF options can auto-detect answers |
| Exams | Window, time limit, pass mark, max attempts, optional quiz password |
| Paper | Pick from bank, set points and order; optional shuffle of questions / options |
| Access flags | Jump, go back, review; optional **student roster** (only listed students see the exam) |
| Gradebook | Sortable results, CSV export, per-attempt regrade / override |

Scoring modes: all-or-nothing, per-blank / per-slot, multiple-choice with optional plus/minus.

#### 4.3 Student

| Step | What happens |
|------|----------------|
| My exams | Only exams you are allowed to take (open exams or roster) |
| Sit paper | Timer, navigator, per-question save; jump / back / review follow teacher flags |
| Submit | Completion check, then score |
| Review | Summary, answers, and review pages when the exam allows it |

#### 4.4 Environment

```env
DATABASE_URL="postgresql://exam:exam@localhost:5432/examdb?schema=public"
AUTH_SECRET="change-me-to-a-long-random-string"
NEXTAUTH_URL="http://localhost:xxx"
```

`AUTH_SECRET` must be the random string you generated in §3.1 (not the example placeholder). `xxx` is the **actual** Next port from the terminal, not a fixed `3000` / `3001`.

### 5. Testing

```bash
npm test
```

Unit tests cover grading, choice limits, snapshot attempts, and PDF colour parsing. They do not need a running browser.

### 6. Limitations

- Designed for **local / LAN** use with Docker Postgres; no hosted multi-tenant setup in this repo.
- Seed is demo-only. A real question bank lives in PostgreSQL and `public/uploads/` — keep both out of git.
- PDF import quality depends on how the source file is highlighted / numbered.
- `npm run db:seed` is destructive on the connected database.

### 7. Documentation note

The **user manual is this README** (sections 3–4), same approach as other small repos in this account.

---



## 简体中文

### 1. 项目简介

ExamBrowser 是一个 **本地 / 校园在线考试系统**（Next.js + PostgreSQL）：

- 教师维护 **题库**、组卷、安排考试、阅卷
- 学生登录后参加 **已开放或已点名** 的考试，并可查看已交答卷
- 仓库种子数据只有 **演示账号和 3 道样例题**，不含真实课程题库

**题型**

| 题型 | 说明 |
|------|------|
| 单选 / 多选 | A–D 等选项，可选配图 |
| 判断 | 对 / 错 |
| 填空 | 题干内空格 + 可接受答案 |
| 匹配 | 把标签填入槽位 |

**典型场景：** 期中练习、闭卷测验、从 PDF / Word / CSV / JSON 导入题目。

### 2. 目录结构

```
ExamBrowser/
├─ src/                    # 页面、组件、鉴权与评分
├─ prisma/                 # 数据模型 + 演示种子
├─ public/templates/       # 导入模板
├─ public/uploads/.gitkeep # 只保留空上传目录
├─ docker-compose.yml      # 本地 PostgreSQL
├─ .env.example
└─ README.md
```

### 3. 启动方式

需要已打开的 **Docker Desktop** 和 **Node.js 20+**。

#### 3.1 第一次安装

```bash
git clone https://github.com/Flin0498/ExamBrowser.git
cd ExamBrowser
docker compose up -d
cp .env.example .env
```

用记事本 / VS Code 打开项目根目录的 `.env`，一共三行，需要改其中两处：

`AUTH_SECRET`**（登录会话密钥）**  
把等号右边的占位文字 `change-me-to-a-long-random-string` **整段删掉**，换成你自己生成的一串随机字符（建议 32 位以上）。在终端生成后复制进去即可：

```bash
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

# macOS / Linux
openssl rand -base64 32
```

改完后这一行应类似：

```env
AUTH_SECRET="k8Qm2nR4pX......你自己的那一串......9fL"
```

不要留着示例原文。这串字用来给登录 Cookie 签名，每人 / 每台机器各写一份即可，不必记住。

`NEXTAUTH_URL`  
先保持 `http://localhost:xxx`。等下面 `npm run dev` 打出真实端口后再改 `xxx`。

然后执行：

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

终端会出现类似 `Local: http://localhost:3000` 或 `http://localhost:3001`，其中的数字就是 `xxx`。

1. 用浏览器打开终端里打印的 **完整地址**（不要自己猜端口）。
2. 回到 `.env`，把 `NEXTAUTH_URL` 改成同一地址，例如 `NEXTAUTH_URL="http://localhost:3001"`。
3. 在终端按 `Ctrl+C` 停掉服务，再执行一次 `npm run dev`，登录跳转才会用新地址。

`npm run db:seed` 会 **清空** 当前库里的用户、题目、考试，再写入演示数据。已经有真实题库时 **不要** 再跑。

#### 3.2 以后每次开机（库已经建好）

不要再 `cp .env.example`，也不要跑 `db:push` / `db:seed`（除非你打算清空重来）。

```bash
cd ExamBrowser
docker compose up -d
npm run dev
```

浏览器打开终端打印的 `http://localhost:xxx`。端口和上次相同就不用改 `.env`。若 3000 被别的软件占用、Next 改用了新端口，把 `NEXTAUTH_URL` 改成新地址后再 `Ctrl+C` 并重新 `npm run dev`。

关网站：终端里 `Ctrl+C`。数据库可以一直开着。若也要关掉 Postgres：`docker compose stop`。

### 4. 使用说明

#### 4.1 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 教师 | `teacher` | `teacher123` |
| 学生 | `student1` | `student123` |
| 学生 | `student2` | `student123` |

以上为 **可公开的演示账号**。真实学号、班别、课程题库只存在你自己的本地数据库中，不要提交到 Git。

#### 4.2 教师端

| 模块 | 功能 |
|------|------|
| 课程 / 分类 | 建课、打标签、把题目挂到课程 |
| 题库 | 增删改、富文本题干（文字 / 图 / 公式）、筛选、排序 |
| 导入 | 支持 `.json` `.csv` `.docx` `.pdf` `.txt`；PDF 里红色标注的正确选项可自动识别 |
| 考试设置 | 开闭考时间、限时、及格分、作答次数、可选进场密码 |
| 组卷 | 从题库勾选、设分、调序；可选打乱题目 / 选项 |
| 权限 | 是否允许跳题、回退、回顾；可选 **学生名单**（仅名单内可见） |
| 成绩 | 成绩表排序、导出 CSV、按份重判 / 手工改分 |

计分：全对才给分、按空 / 按槽给分、多选可选加减分。

#### 4.3 学生端

| 步骤 | 说明 |
|------|------|
| 我的考试 | 只显示你有权参加的场次（全员开放或在名单内） |
| 作答 | 倒计时、题号导航、逐题保存；跳题 / 回退 / 回顾跟教师设置走 |
| 交卷 | 检查完成度后出分 |
| 回顾 | 在教师允许时查看摘要、作答与解析页 |

#### 4.4 环境变量

```env
DATABASE_URL="postgresql://exam:exam@localhost:5432/examdb?schema=public"
AUTH_SECRET="change-me-to-a-long-random-string"
NEXTAUTH_URL="http://localhost:xxx"
```

`AUTH_SECRET` 必须是 §3.1 里自己生成的那串，不能留占位原文。`xxx` 必须改成 **终端里 Next 实际打印的端口**，不要写死 3000 或 3001。

### 5. 测试

```bash
npm test
```

覆盖评分、选项限制、试卷快照、PDF 颜色解析。不需要打开浏览器。

### 6. 限制说明

- 面向 **本机 / 局域网** + Docker Postgres，本仓库不含多租户云部署。
- 种子只有演示数据。真实题库在 PostgreSQL 和 `public/uploads/`，都不要进 git。
- PDF 导入效果取决于原文件是否标红、是否按题号编写。
- `npm run db:seed` 对所连数据库是破坏性操作。

### 7. 文档说明

**使用手册已写在本 README**（第 3–4 节），与本账号其他小型仓库一致。
