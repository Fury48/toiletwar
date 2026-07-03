# Toilet War

남자 화장실의 암묵적인 거리두기 규칙을 이용한 턴제 웹 게임 프로토타입입니다. 파란색은 사용자, 빨간색은 간단한 AI입니다.

## 실행 방법

파일만 열어도 실행됩니다.

```bash
cd toiletwar
python -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 열면 됩니다. Windows에서 `python` 명령이 잡히지 않으면 아래 명령을 사용하세요.

```bash
py -m http.server 8080
```

## 규칙

- 맨 앞에 있는 파란색 사람을 소변기로 드래그하거나, 파란색 사람을 선택한 뒤 소변기를 클릭합니다.
- 첫 수는 아무 빈 소변기에 둘 수 있습니다.
- 이후에는 양옆에 사람이 없는 빈 소변기만 사용할 수 있습니다.
- 내가 둔 뒤 상대가 둘 수 있는 소변기가 없으면 체크메이트로 승리합니다.

## GitHub 연동

정적 파일만 사용하는 구조라 GitHub Pages에 바로 올릴 수 있습니다.

```bash
git init
git add .
git commit -m "Create toilet war prototype"
git branch -M main
git remote add origin https://github.com/USER/REPOSITORY.git
git push -u origin main
```

GitHub 저장소의 `Settings > Pages`에서 `main` 브랜치의 루트를 배포 대상으로 선택하면 됩니다.

## 파일 구조

```text
toiletwar/
  index.html
  style.css
  script.js
  README.md
  .gitignore
```
