import json
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent_worker import main as worker_main


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=worker_main, daemon=True)
    thread.start()
    yield


app = FastAPI(lifespan=lifespan)

DIST_DIR = Path(__file__).parent / "front" / "dist"
USER_INPUT_FILE = Path(__file__).parent / "front" / "user_input.json"
MESSAGES_FILE = Path(__file__).parent / "front" / "messages.json"
DEBUG_FILE = Path(__file__).parent / "front" / "debug.json"


def load_messages() -> list[dict]:
    try:
        return json.loads(MESSAGES_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_messages(messages: list[dict]):
    MESSAGES_FILE.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")


class MessageIn(BaseModel):
    text: str


class SaveInput(BaseModel):
    text: str


@app.post("/api/message", status_code=201)
def post_message(msg: MessageIn):
    if not msg.text:
        raise HTTPException(status_code=400, detail="Text is required")

    new_message = {
        "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
        "text": msg.text,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    messages = load_messages()
    messages.insert(0, new_message)
    del messages[3:]
    save_messages(messages)

    return new_message


@app.get("/api/message")
def get_messages():
    return load_messages()


@app.get("/api/debug")
def get_debug():
    try:
        return json.loads(DEBUG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


@app.get("/api/input")
def get_latest_input():
    try:
        data = json.loads(USER_INPUT_FILE.read_text(encoding="utf-8"))
        return data[-1] if data else {}
    except Exception:
        return {}


@app.post("/api/save-input")
def save_input(data: SaveInput):
    new_data = {
        "text": data.text,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    existing = []
    try:
        with open(USER_INPUT_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except Exception:
        existing = []

    existing.append(new_data)

    with open(USER_INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    return {"message": "saved", "saved": new_data}


# React 정적 파일 서빙 (API 라우트 등록 후 마지막에)
app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
