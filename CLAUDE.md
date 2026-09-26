# CLAUDE.md

나한테 설명할 때는 한국어로 설명해줘.

@AGENTS.md

## Claude Code 전용

- **모든 작업마다 무엇을 / 왜 / 장단점(대안)** 을 설명한다. 담당자는 이걸로 공부한다.
- 작업 단위가 끝나면 `/log-work` 로 `notes/study-notes.html`(담당자 전용 학습 노트)과 status.md 를 갱신한다.
- 연수자용 문서는 `/write-guide` 규칙을 따른다.
- 질문(grilling)은 AskUserQuestion 형식으로 한다.
- AWS 는 로컬에서 `--profile mfa` 를 쓴다 (최초 bootstrap·OIDC 역할만).
- 컨텍스트를 아낀다: 긴 출력은 필요한 부분만 보고, 확인한 사실은 status.md 에 남겨 다시 조사하지 않는다.

## 현재 진행 상황

@.claude/context/status.md
