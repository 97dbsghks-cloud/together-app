import json
import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

try:
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import SystemMessage, HumanMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

# ---------- DB Connection ----------
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    url = DATABASE_URL.replace("postgres://", "postgresql://", 1) if DATABASE_URL else None
    if not url:
        raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다.")
    return psycopg2.connect(url)

# ---------- Models ----------
class ChatMessage(BaseModel):
    id: str
    author: str
    content: str
    createdAt: str
    isAdmin: bool = False

class CalendarEvent(BaseModel):
    id: str
    title: str
    date: str
    endDate: Optional[str] = None
    color: str
    description: Optional[str] = None
    important: Optional[bool] = None

class TaskItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    columnId: str
    dueDate: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
    checklist: Optional[List[Dict[str, Any]]] = None

class ColumnItem(BaseModel):
    id: str
    title: str
    color: str

class ProjectBoard(BaseModel):
    id: str
    name: str
    emoji: Optional[str] = "📁"
    abbr: Optional[str] = None
    projectCode: Optional[str] = None
    avatarColor: Optional[str] = None
    columns: List[ColumnItem]
    tasks: List[TaskItem]
    events: Optional[List[CalendarEvent]] = []
    messages: Optional[List[ChatMessage]] = []
    gantt: Optional[Dict[str, Any]] = None
    remember: Optional[List[Dict[str, Any]]] = []
    meetings: Optional[List[Dict[str, Any]]] = []

class RegisterRequest(BaseModel):
    name: str
    password: str

class LoginRequest(BaseModel):
    name: str
    password: str

class AssignProjectsRequest(BaseModel):
    projectIds: List[str]

class ChangePasswordRequest(BaseModel):
    password: str

class ChangeRoleRequest(BaseModel):
    role: str

class CreateProjectRequest(BaseModel):
    name: str
    emoji: Optional[str] = "📁"

class AIChatRequest(BaseModel):
    message: str
    board_summary: Optional[List[Dict]] = []
    column_ids: Optional[List[Dict]] = []
    api_key: Optional[str] = None
    model: Optional[str] = "gpt-4o"

class FeedbackComment(BaseModel):
    id: str
    author: str
    content: str
    createdAt: str
    isAdmin: bool = False

class FeedbackPost(BaseModel):
    id: str
    title: str
    content: str
    author: str
    createdAt: str
    status: str = "pending"
    comments: List[FeedbackComment] = []

class UpdateStatusRequest(BaseModel):
    status: str

class Announcement(BaseModel):
    id: str
    title: str
    content: str
    authorName: str
    createdAt: str

# ---------- DB helpers ----------
DEFAULT_COLUMNS = [
    {"id": "todo", "title": "To do", "color": "#6e6e73"},
    {"id": "in-progress", "title": "In Progress", "color": "#007aff"},
    {"id": "review", "title": "In Review", "color": "#ff9f0a"},
    {"id": "done", "title": "Completed", "color": "#34c759"},
    {"id": "archived", "title": "Archived", "color": "#af52de"},
]

def init_db():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id   TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id          TEXT PRIMARY KEY,
                    name        TEXT NOT NULL UNIQUE,
                    password    TEXT NOT NULL,
                    role        TEXT NOT NULL DEFAULT 'member',
                    project_ids JSONB NOT NULL DEFAULT '[]'
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id   TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS announcements (
                    id   TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value JSONB NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS global_chat (
                    id         TEXT PRIMARY KEY,
                    author     TEXT NOT NULL,
                    content    TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_admin   BOOLEAN NOT NULL DEFAULT FALSE
                )
            """)
            conn.commit()

            # Seed projects from db.json if table is empty
            cur.execute("SELECT COUNT(*) FROM projects")
            if cur.fetchone()[0] == 0 and os.path.exists("db.json"):
                with open("db.json", "r", encoding="utf-8") as f:
                    db_data = json.load(f)
                for project in db_data.get("projects", {}).values():
                    project.setdefault("events", [])
                    project.setdefault("messages", [])
                    cur.execute(
                        "INSERT INTO projects (id, data) VALUES (%s, %s)",
                        (project["id"], psycopg2.extras.Json(project))
                    )
                conn.commit()
                print(f"Seeded {len(db_data['projects'])} projects from db.json")

            # Seed users from users.json if table is empty
            cur.execute("SELECT COUNT(*) FROM users")
            if cur.fetchone()[0] == 0 and os.path.exists("users.json"):
                with open("users.json", "r", encoding="utf-8") as f:
                    users_data = json.load(f)
                for user in users_data:
                    cur.execute(
                        """INSERT INTO users (id, name, password, role, project_ids)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (user["id"], user["name"], user["password"],
                         user["role"], psycopg2.extras.Json(user.get("projectIds", [])))
                    )
                conn.commit()
                print(f"Seeded {len(users_data)} users from users.json")

            # Seed feedback from feedback.json if table is empty
            cur.execute("SELECT COUNT(*) FROM feedback")
            if cur.fetchone()[0] == 0 and os.path.exists("feedback.json"):
                with open("feedback.json", "r", encoding="utf-8") as f:
                    feedback_data = json.load(f)
                for post in feedback_data:
                    cur.execute(
                        "INSERT INTO feedback (id, data) VALUES (%s, %s)",
                        (post["id"], psycopg2.extras.Json(post))
                    )
                conn.commit()
                print(f"Seeded {len(feedback_data)} feedback posts from feedback.json")
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Together Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Project DB helpers ----------

def load_db() -> dict:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, data FROM projects")
            rows = cur.fetchall()
            return {"projects": {row["id"]: row["data"] for row in rows}}
    finally:
        conn.close()

def save_project(project: dict):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO projects (id, data) VALUES (%s, %s)
                   ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data""",
                (project["id"], psycopg2.extras.Json(project))
            )
        conn.commit()
    finally:
        conn.close()

def delete_project_row(project_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM projects WHERE id = %s", (project_id,))
        conn.commit()
    finally:
        conn.close()

# ---------- User DB helpers ----------

def load_users() -> list:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, password, role, project_ids FROM users")
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "password": row["password"],
                    "role": row["role"],
                    "projectIds": row["project_ids"],
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()

def save_users(users: list):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for user in users:
                cur.execute(
                    """INSERT INTO users (id, name, password, role, project_ids)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (id) DO UPDATE
                           SET name        = EXCLUDED.name,
                               password    = EXCLUDED.password,
                               role        = EXCLUDED.role,
                               project_ids = EXCLUDED.project_ids""",
                    (user["id"], user["name"], user["password"],
                     user["role"], psycopg2.extras.Json(user.get("projectIds", [])))
                )
        conn.commit()
    finally:
        conn.close()

def strip_password(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password"}

# ---------- Feedback DB helpers ----------

def load_feedback() -> list:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT data FROM feedback ORDER BY (data->>'createdAt') DESC")
            return [row["data"] for row in cur.fetchall()]
    finally:
        conn.close()

def save_feedback_post(post: dict):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO feedback (id, data) VALUES (%s, %s)
                   ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data""",
                (post["id"], psycopg2.extras.Json(post))
            )
        conn.commit()
    finally:
        conn.close()

def delete_feedback_row(post_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM feedback WHERE id = %s", (post_id,))
        conn.commit()
    finally:
        conn.close()

# ---------- Announcement DB helpers ----------

def load_announcements() -> list:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT data FROM announcements ORDER BY (data->>'createdAt') DESC")
            return [row["data"] for row in cur.fetchall()]
    finally:
        conn.close()

def save_announcement(announcement: dict):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO announcements (id, data) VALUES (%s, %s)
                   ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data""",
                (announcement["id"], psycopg2.extras.Json(announcement))
            )
        conn.commit()
    finally:
        conn.close()

def delete_announcement_row(announcement_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM announcements WHERE id = %s", (announcement_id,))
        conn.commit()
    finally:
        conn.close()

# ---------- Routes ----------
@app.get("/")
def read_root():
    return {"message": "Together Backend is running."}

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    users = load_users()
    if any(u["name"] == req.name for u in users):
        raise HTTPException(status_code=400, detail="이미 사용 중인 이름입니다.")
    role = "admin" if len(users) == 0 else "member"
    user = {"id": str(uuid.uuid4()), "name": req.name, "password": req.password,
            "role": role, "projectIds": []}
    users.append(user)
    save_users(users)
    return strip_password(user)

@app.post("/api/auth/login")
def login(req: LoginRequest):
    users = load_users()
    user = next((u for u in users if u["name"] == req.name and u["password"] == req.password), None)
    if not user:
        raise HTTPException(status_code=401, detail="이름 또는 비밀번호가 올바르지 않습니다.")
    return strip_password(user)

# ── Users ─────────────────────────────────────────────────────────────────────
@app.get("/api/users")
def list_users():
    return {"users": [strip_password(u) for u in load_users()]}

@app.put("/api/users/{user_id}/projects")
def assign_projects(user_id: str, req: AssignProjectsRequest):
    users = load_users()
    for user in users:
        if user["id"] == user_id:
            user["projectIds"] = req.projectIds
            save_users(users)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@app.put("/api/users/{user_id}/password")
def change_password(user_id: str, req: ChangePasswordRequest):
    users = load_users()
    for user in users:
        if user["id"] == user_id:
            user["password"] = req.password
            save_users(users)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="User not found")

@app.put("/api/users/{user_id}/role")
def change_role(user_id: str, req: ChangeRoleRequest):
    if req.role not in ("member", "sub_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    users = load_users()
    for user in users:
        if user["id"] == user_id:
            if user["role"] == "admin":
                raise HTTPException(status_code=403, detail="관리자 권한은 변경할 수 없습니다.")
            user["role"] = req.role
            save_users(users)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="User not found")

# ── Projects ──────────────────────────────────────────────────────────────────
@app.get("/api/projects")
def list_projects(userId: Optional[str] = None):
    db = load_db()
    projects_meta = [
        {"id": p["id"], "name": p["name"], "emoji": p.get("emoji", "📁"),
         "abbr": p.get("abbr"), "projectCode": p.get("projectCode"),
         "avatarColor": p.get("avatarColor"),
         "taskCount": len(p.get("tasks", [])),
         "doneCount": len([t for t in p.get("tasks", []) if t.get("columnId") == "done"])}
        for p in db["projects"].values()
    ]
    if userId:
        users = load_users()
        user = next((u for u in users if u["id"] == userId), None)
        if user and user["role"] not in ("admin", "sub_admin"):
            allowed = set(user.get("projectIds", []))
            projects_meta = [p for p in projects_meta if p["id"] in allowed]
    return {"projects": projects_meta}

# ── Project Order (must be before /{project_id} routes) ───────────────────────
class ProjectOrderRequest(BaseModel):
    order: List[str]

@app.get("/api/projects/order")
def get_project_order():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT value FROM settings WHERE key = 'project_order'")
            row = cur.fetchone()
            return {"order": row["value"] if row else []}
    finally:
        conn.close()

@app.put("/api/projects/order")
def save_project_order(req: ProjectOrderRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO settings (key, value) VALUES ('project_order', %s)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                (psycopg2.extras.Json(req.order),)
            )
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@app.get("/api/settings/tab-order")
def get_tab_order():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT value FROM settings WHERE key = 'tab_order'")
            row = cur.fetchone()
            return {"order": row["value"] if row else []}
    finally:
        conn.close()

@app.put("/api/settings/tab-order")
def save_tab_order(req: ProjectOrderRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO settings (key, value) VALUES ('tab_order', %s)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                (psycopg2.extras.Json(req.order),)
            )
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    return db["projects"][project_id]

@app.post("/api/projects")
def create_project(req: CreateProjectRequest):
    pid = str(uuid.uuid4())
    project = {
        "id": pid,
        "name": req.name,
        "emoji": req.emoji or "📁",
        "columns": [c.copy() for c in DEFAULT_COLUMNS],
        "tasks": [],
        "events": [],
        "messages": [],
    }
    save_project(project)
    return {"id": pid, "name": req.name}

@app.put("/api/projects/{project_id}")
def update_project(project_id: str, board: ProjectBoard):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    save_project(board.dict())
    return {"status": "success"}

class ProjectMetaPatch(BaseModel):
    abbr: Optional[str] = None
    projectCode: Optional[str] = None
    avatarColor: Optional[str] = None

@app.patch("/api/projects/{project_id}/meta")
def patch_project_meta(project_id: str, meta: ProjectMetaPatch):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    if meta.abbr is not None:
        project["abbr"] = meta.abbr
    if meta.projectCode is not None:
        project["projectCode"] = meta.projectCode
    if meta.avatarColor is not None:
        project["avatarColor"] = meta.avatarColor
    save_project(project)
    return {"status": "success"}

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    if len(db["projects"]) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last project")
    delete_project_row(project_id)
    return {"status": "success"}

@app.post("/api/projects/{project_id}/messages")
def add_message(project_id: str, message: ChatMessage):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project.setdefault("messages", []).append(message.dict())
    save_project(project)
    return {"status": "success"}

@app.delete("/api/projects/{project_id}/messages/{message_id}")
def delete_message(project_id: str, message_id: str):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project["messages"] = [m for m in project.get("messages", []) if m["id"] != message_id]
    save_project(project)
    return {"status": "success"}

# ── Task granular endpoints (prevents last-write-wins on concurrent edits) ────

@app.post("/api/projects/{project_id}/tasks")
def add_task(project_id: str, task: TaskItem):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project.setdefault("tasks", []).append(task.dict())
    save_project(project)
    return {"status": "success"}

@app.patch("/api/projects/{project_id}/tasks/{task_id}")
def update_task(project_id: str, task_id: str, task: TaskItem):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project["tasks"] = [task.dict() if t["id"] == task_id else t for t in project.get("tasks", [])]
    save_project(project)
    return {"status": "success"}

@app.delete("/api/projects/{project_id}/tasks/{task_id}")
def delete_task_endpoint(project_id: str, task_id: str):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project["tasks"] = [t for t in project.get("tasks", []) if t["id"] != task_id]
    save_project(project)
    return {"status": "success"}

@app.patch("/api/projects/{project_id}/tasks-order")
def reorder_tasks(project_id: str, req: ProjectOrderRequest):
    """Reorder tasks by id list (drag & drop)"""
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    task_map = {t["id"]: t for t in project.get("tasks", [])}
    project["tasks"] = [task_map[tid] for tid in req.order if tid in task_map]
    save_project(project)
    return {"status": "success"}

# ── Column granular endpoints ─────────────────────────────────────────────────

@app.post("/api/projects/{project_id}/columns")
def add_column(project_id: str, column: ColumnItem):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project.setdefault("columns", []).append(column.dict())
    save_project(project)
    return {"status": "success"}

@app.patch("/api/projects/{project_id}/columns/{column_id}")
def update_column(project_id: str, column_id: str, column: ColumnItem):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project["columns"] = [column.dict() if c["id"] == column_id else c for c in project.get("columns", [])]
    save_project(project)
    return {"status": "success"}

@app.delete("/api/projects/{project_id}/columns/{column_id}")
def delete_column_endpoint(project_id: str, column_id: str):
    db = load_db()
    if project_id not in db["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    project = db["projects"][project_id]
    project["columns"] = [c for c in project.get("columns", []) if c["id"] != column_id]
    project["tasks"] = [t for t in project.get("tasks", []) if t["columnId"] != column_id]
    save_project(project)
    return {"status": "success"}

# ── AI Chat ───────────────────────────────────────────────────────────────────
@app.post("/api/ai/chat")
def ai_chat(req: AIChatRequest):
    if not LANGCHAIN_AVAILABLE:
        return {"reply": "LangChain이 설치되지 않았습니다.", "new_tasks": [], "target_column_id": None}

    api_key = req.api_key or os.getenv("OPENAI_API_KEY")
    model = req.model or "gpt-4o"

    board_context = ""
    if req.board_summary:
        lines = []
        for col in req.board_summary:
            lines.append(f"- [{col['column']}] {col['count']}개: {', '.join(col['tasks'][:5]) if col['tasks'] else '없음'}")
        board_context = "\n".join(lines)

    col_list = ", ".join([f"{c['id']}({c['title']})" for c in (req.column_ids or [])])

    system_prompt = f"""당신은 프로젝트 매니저 AI 비서입니다. 현재 칸반 보드:
{board_context or '(태스크 없음)'}

사용 가능한 열 ID: {col_list}

업무 분해 요청 시 반드시 아래 JSON 포함:
{{"new_tasks": [{{"title": "...", "description": "...", "priority": "low|medium|high"}}], "target_column_id": "열id"}}

일정 분석, 리스크 검토는 plain text로 한국어 응답."""

    try:
        if "gemini" in model:
            from langchain_google_genai import ChatGoogleGenerativeAI
            key = req.api_key or os.getenv("GOOGLE_API_KEY")
            llm = ChatGoogleGenerativeAI(model=model, google_api_key=key, max_output_tokens=1500)
        else:
            llm = ChatOpenAI(model_name=model, api_key=api_key, max_tokens=1500)

        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=req.message)])
        full_text = response.content

        import re
        new_tasks, target_col = [], None
        json_match = re.search(r'\{[\s\S]*"new_tasks"[\s\S]*\}', full_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                new_tasks = parsed.get("new_tasks", [])
                target_col = parsed.get("target_column_id", "todo")
                full_text = full_text[:json_match.start()].strip() + "\n\n아래 태스크들을 보드에 추가할 수 있습니다."
            except: pass

        return {"reply": full_text.strip(), "new_tasks": new_tasks, "target_column_id": target_col}
    except Exception as e:
        return {"reply": f"오류: {str(e)}", "new_tasks": [], "target_column_id": None}

# ── Feedback Board ─────────────────────────────────────────────────────────────
@app.get("/api/feedback")
def get_feedback():
    return {"feedback": load_feedback()}

@app.post("/api/feedback")
def create_feedback(post: FeedbackPost):
    save_feedback_post(post.dict())
    return {"status": "success", "id": post.id}

@app.post("/api/feedback/{post_id}/comments")
def add_comment(post_id: str, comment: FeedbackComment):
    posts = load_feedback()
    for post in posts:
        if post["id"] == post_id:
            post["comments"].append(comment.dict())
            save_feedback_post(post)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="Post not found")

@app.patch("/api/feedback/{post_id}/status")
def update_status(post_id: str, body: UpdateStatusRequest):
    posts = load_feedback()
    for post in posts:
        if post["id"] == post_id:
            post["status"] = body.status
            save_feedback_post(post)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="Post not found")

@app.delete("/api/feedback/{post_id}")
def delete_feedback_post(post_id: str):
    delete_feedback_row(post_id)
    return {"status": "success"}

# ── Announcements ──────────────────────────────────────────────────────────────
@app.get("/api/announcements")
def get_announcements():
    return {"announcements": load_announcements()}

@app.post("/api/announcements")
def create_announcement(announcement: Announcement):
    save_announcement(announcement.dict())
    return {"status": "success", "id": announcement.id}

@app.delete("/api/announcements/{announcement_id}")
def delete_announcement(announcement_id: str):
    delete_announcement_row(announcement_id)
    return {"status": "success"}

@app.put("/api/announcements/{announcement_id}")
def update_announcement(announcement_id: str, announcement: Announcement):  # noqa: ARG001
    save_announcement(announcement.dict())
    return {"status": "success"}

# ── Global Chat ─────────────────────────────────────────────────────────────────
@app.get("/api/global-chat")
def get_global_chat():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, author, content, created_at AS \"createdAt\", is_admin AS \"isAdmin\" FROM global_chat ORDER BY created_at ASC")
            rows = cur.fetchall()
        return {"messages": [dict(r) for r in rows]}
    finally:
        conn.close()

@app.post("/api/global-chat")
def post_global_chat(message: ChatMessage):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO global_chat (id, author, content, created_at, is_admin) VALUES (%s, %s, %s, %s, %s)",
                (message.id, message.author, message.content, message.createdAt, message.isAdmin)
            )
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@app.delete("/api/global-chat/{message_id}")
def delete_global_chat(message_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM global_chat WHERE id = %s", (message_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()
