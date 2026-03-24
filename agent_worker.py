import os
import json
import time
import logging
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "Aa_in", ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [worker] %(message)s", force=True)
log = logging.getLogger(__name__)

RENDER_URL = "https://walwal-ke0m.onrender.com"
POLL_INTERVAL = 5  # 초


def main():
    log.info("🐾 Agent Worker 초기화 중...")

    try:
        from openai import OpenAI
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import AIMessage
        from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
        from langgraph.graph import StateGraph, MessagesState, START, END
        from typing import Literal
        from pydantic import BaseModel, Field

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        llm = ChatOpenAI(model="gpt-5.4", temperature=0.6, max_tokens=1000)
        small_llm = ChatOpenAI(model="gpt-5.4-mini", temperature=0.6, max_tokens=1000)


        # ── 안전성 검사 ────────────────────────────────────────────────
        def is_safe(user_prompt: str) -> bool:
            system_prompt = """다음 입력이 악의적이거나 시스템에 해를 입힐 수 있다면 False를, 아니라면 True만 반환하세요."""
            response = client.chat.completions.create(
                model="gpt-5.4-nano-2026-03-17",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_completion_tokens=5,
                temperature=0
            )
            return response.choices[0].message.content.strip().lower() == "true"

        # ── AgentState ─────────────────────────────────────────────────
        class AgentState(MessagesState):
            response: str
            reason: str
            next: str
            reading: str

        # ── Supervisor ─────────────────────────────────────────────────
        class SuperVisor(BaseModel):
            response_reason: str
            next_node: Literal["Agent1", "Agent2", "Agent3", "Agent4", "Agent5"]

        router_prompt = ChatPromptTemplate.from_messages([
            ("system", """
            당신은 라우터 에이전트입니다.
            1. 사용자가 반려동물의 상태나 건강에 대해서 물으면 Agent1 노드로 연결하세요.
            2. 사용자가 반려동물의 행동에 대해서 물으면 Agent2 노드로 연결하세요.
            3. 사용자가 서비스에 대해 물으면 Agent3 노드로 연결하세요.
            4. 사용자가 그 외의 것에 대해 질문하면 Agent4 노드로 연결하세요.
            모든 결정에는 간단하고 짧게 이유를 명시하세요."""),
            MessagesPlaceholder(variable_name="messages")
        ])
        supervisor_llm = small_llm.with_structured_output(SuperVisor)
        router_chain = router_prompt | supervisor_llm

        def supervisor(state: AgentState) -> AgentState:
            response = router_chain.invoke({"messages": state["messages"]})
            return {"next": response.next_node, "reason": response.response_reason}

        # ── Agents ─────────────────────────────────────────────────────
        class Agent1(BaseModel):
            insight: str = Field(description="")
            response: str = Field(description="")

        class Agent2(BaseModel):
            insight: str = Field(description="")
            response: str = Field(description="")

        class Agent3(BaseModel):
            insight: str = Field(description="")
            response: str = Field(description="")

        class Agent4(BaseModel):
            insight: str = Field(description="")
            response: str = Field(description="")

        class Agent5(BaseModel):
            insight: str = Field(description="")
            response: str = Field(description="")

        def make_agent(prompt_text: str, agent_class, use_small_llm: bool = False):
            base_llm = small_llm if use_small_llm else llm
            prompt = ChatPromptTemplate.from_messages([
                ("system", prompt_text),
                MessagesPlaceholder(variable_name="messages")
            ])
            chain = prompt | base_llm.with_structured_output(agent_class)

            def agent(state: AgentState) -> AgentState:
                r = chain.invoke({"messages": state["messages"]})
                return {"response": r.response, "messages": [AIMessage(content=r.response)]}
            return agent

        agent1 = make_agent("당신은 에이전트1입니다.", Agent1)
        agent2 = make_agent("당신은 에이전트2입니다.", Agent2)
        agent3 = make_agent("""당신은 본 서비스의 고객 담당 상담사입니다.
            장애대응과 서비스 안내에 특화되어 있습니다.
            아래 규칙을 지키며 고객에게 추가 정보를 얻기 위해 다시 질문해야 할지, 바로 답변해야 할지 결정하세요.
            고객에게 정확한 안내를 하기 위해 꼭 필요할 때만 추가질문을 하세요.

            [질문시 규칙]
            간결하지만 친절한 어조로 질문하세요.

            [답변시 규칙]
            정중하고 친절하게 고객의 질문에 답변하세요.
            마크다운 없이 답변하세요.
            고객이 이해하기 쉽게 하지만 간결하게 답변하세요.""", Agent3, use_small_llm=True)
        agent4 = make_agent("""당신은 컴플레인 처리반, 에이전트4입니다.
            사용자의 엉뚱한 질문에 그런 질문은 우리 서비스가 답변을 제공하지 않는 점을 정중히 답변하세요.
            말이 안되는 요구나 억지에는 정중히 거절하세요.
            모욕적이거나 공격적인 언어에는 대응하지 말고 단호히 경고하세요.""", Agent4, use_small_llm=True)
        agent5 = make_agent("당신은 에이전트5입니다.", Agent5, use_small_llm=True)

        # ── 그래프 빌드 ────────────────────────────────────────────────
        builder = StateGraph(AgentState)
        builder.add_node("supervisor", supervisor)
        for i, a in enumerate([agent1, agent2, agent3, agent4, agent5], 1):
            builder.add_node(f"agent{i}", a)

        builder.add_edge(START, "supervisor")
        builder.add_conditional_edges("supervisor", lambda state: state["next"], {
            "Agent1": "agent1", "Agent2": "agent2", "Agent3": "agent3",
            "Agent4": "agent4", "Agent5": "agent5",
        })
        for i in range(1, 6):
            builder.add_edge(f"agent{i}", END)

        workflow = builder.compile()
        log.info("✅ Agent Worker 초기화 완료")

    except Exception as e:
        log.error(f"❌ 초기화 실패: {e}", exc_info=True)
        return

    # ── 파일 직접 읽기/쓰기 (HTTP 자기요청 제거) ──────────────────────
    from pathlib import Path
    from datetime import datetime, timezone

    BASE_DIR = Path(__file__).parent
    USER_INPUT_FILE = BASE_DIR / "front" / "user_input.json"
    MESSAGES_FILE = BASE_DIR / "front" / "messages.json"

    def fetch_user_prompt():
        try:
            data = json.loads(USER_INPUT_FILE.read_text(encoding="utf-8"))
            return data[-1] if data else {}
        except Exception as e:
            log.warning(f"입력 조회 실패: {e}")
            return {}

    def send_message_to_server(message: str):
        try:
            new_msg = {
                "id": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
                "text": message,
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            try:
                messages = json.loads(MESSAGES_FILE.read_text(encoding="utf-8"))
            except Exception:
                messages = []
            messages.insert(0, new_msg)
            del messages[3:]
            MESSAGES_FILE.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
            log.info(f"✅ 메시지 저장: {message}")
        except Exception as e:
            log.warning(f"메시지 저장 실패: {e}")

    # ── 폴링 루프 ───────────────────────────────────────────────────────
    log.info(f"🔄 폴링 시작 (서버: {RENDER_URL}, 간격: {POLL_INTERVAL}초)")
    last_processed_timestamp = None

    while True:
        try:
            data = fetch_user_prompt()
            timestamp = data.get("timestamp")
            user_prompt = data.get("text", "").strip()

            if user_prompt and timestamp != last_processed_timestamp:
                log.info(f"📩 새 입력: {user_prompt}")
                last_processed_timestamp = timestamp

                if not is_safe(user_prompt):
                    log.info("🚫 안전하지 않은 입력")
                    send_message_to_server("죄송합니다, 해당 질문에는 답변드리기 어렵습니다.")
                else:
                    for r in workflow.stream({"messages": [("user", user_prompt)]}):
                        for key, value in r.items():
                            log.info(f"[Node: {key}]")
                            response = value.get("response", "")
                            if response:
                                log.info(f"🤖: {response}")
                                send_message_to_server(response)

        except Exception as e:
            log.error(f"❌ 루프 오류: {e}", exc_info=True)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
