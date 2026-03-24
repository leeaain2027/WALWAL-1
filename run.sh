# 터미널에서
# 매번 실행할 때 (빌드 + 서버 시작)
cd front && npm run build && cd .. && uvicorn main:app --reload
