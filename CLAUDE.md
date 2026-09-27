# CLAUDE.md

나한테 설명할 때는 한국어로 설명해줘.

@AGENTS.md

## Claude Code 전용

- **모든 작업마다 무엇을 / 왜 / 장단점(대안)** 을 설명한다. 담당자는 이걸로 공부한다.
  - 설정 파일(워크플로·Dockerfile·hook 등)을 추가하면 **대화에서 바로** 블록·줄 단위로 설명한다: 각 항목이 무엇인지, 왜 넣었는지,
    실제로 어디서(내 PC / GitHub 러너 / 컨테이너) 어떻게 동작하는지, 무엇을 감지·예방하는지, 없으면 어떤 일이 생기는지.
    "노트에 적었다"로 대신하지 않는다. 남이 만든 도구·액션을 쓰면 그 도구가 제공하는 것과 원리까지 설명한다.
- 도구 연결 상태(MCP 등)를 말할 때는 말하기 직전에 실제로 호출해서 확인한다.
- 작업 단위가 끝나면 `/log-work` 로 `notes/study-notes.html`(담당자 전용 학습 노트)과 status.md 를 갱신한다.
- 연수자용 문서는 `/write-guide` 규칙을 따른다.
- 질문(grilling)은 AskUserQuestion 형식으로 한다.
- AWS 는 로컬에서 `--profile mfa` 를 쓴다 (최초 bootstrap·OIDC 역할만).
- 컨텍스트를 아낀다: 긴 출력은 필요한 부분만 보고, 확인한 사실은 status.md 에 남겨 다시 조사하지 않는다.

## 현재 진행 상황

@.claude/context/status.md

## 결정 기록 (grilling 포함, 이유·버린 대안·변경 이력)

@.claude/context/decisions.md
