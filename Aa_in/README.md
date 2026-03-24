```
# 기존 구조
walwal (web)     ← FastAPI + 프론트 서빙
walwal-agent (worker) ← agent_worker.py 폴링 루프
Render 대시보드에서 walwal-agent 서비스에 환경변수 추가 필요:


# 새로운 구조
walwal (web 서비스 하나)
├── FastAPI (HTTP 처리)
└── agent_worker (백그라운드 스레드, 5초 폴링)
두 개가 하나의 프로세스 안에서 동시에 돌아가는.
메인 업무: 손님 주문 받기 (HTTP 요청 처리)
부업무: 주방 주문판 5초마다 확인해서 처리 (폴링)
스레드를 이용해서 비동기로 처리.
[ uvicorn 프로세스 ]
    │
    ├── 스레드 1 (메인): HTTP 요청 대기 → /api/save-input, /api/message 처리
    │
    └── 스레드 2 (백그라운드): while True → 5초 대기 → /api/input 확인 → AI 처리 → 응답 전송


# 실제 동작 순서:
서버 시작
  → 스레드 2 생성 (worker 시작)
  → 스레드 1은 HTTP 요청 대기

사용자가 입력
  → 스레드 1: POST /api/save-input → messages.json 저장

5초 후
  → 스레드 2: GET /api/input 확인 → 새 입력 발견
  → 스레드 2: LangGraph AI 처리
  → 스레드 2: POST /api/message → messages.json 저장

프론트 폴링
  → 스레드 1: GET /api/message → 저장된 응답 반환
  → 화면 업데이트 ✅



daemon=True는 "메인 서버가 종료되면 이 스레드도 같이 종료해라"는 뜻입니다. 서버가 살아있는 동안만 worker도 돌아갑니다.





배포한 주소 → https://walwal-ke0m.onrender.com (실제 URL)


로컬에서 테스트하려면:
RENDER_URL=http://localhost:8000 python agent_worker.py
```

