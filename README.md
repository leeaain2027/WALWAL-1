### front 실행
- render.yaml: 프론트엔드를 render.com에 배포하기 위한 설정파일
- fonrt 폴더: 프론트엔드 코드 모음

**로컬에서 프론트 띄우기(테스트용)**
```shell
# 최초 설치시 한번만 실행 (터미널에서)
source setup.sh


# 설치 이후에는 터미널에서 아래 구문만 실행
source run.sh
```

**브라우저에서 확인**

웹페이지: http://localhost:8000  
API 문서: http://localhost:8000/docs  

---

### 서버 파일
./main.py -> API 서버  
./agent_worker.py -> AI 워커

