# 연수 문서(docs/ko/*.html)를 틀(.claude/doc-src/NN.src.html)에서 만든다.
# 틀에 쓰는 표시:
#   {{EX:경로:시작:끝}}   저장소 파일의 줄을 그대로 발췌 (문서와 코드가 어긋나지 않게)
#   {{IMG:파일|설명}}      docs/assets/img/<이미지 폴더>/파일 을 그림으로
#   {{INC:경로}}           .claude/doc-src/ 아래 부품(도식 SVG 등)을 그대로 넣는다
#   {{MAP:NN}}            장 지도 (현재 장을 강조)
# 사용: python3 .claude/doc-src/build_doc.py <틀> <출력 html> [이미지 폴더]
#       python3 .claude/doc-src/build_doc.py --all   (모든 장)
import html
import os
import re
import sys

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 저장소 루트
here = os.path.dirname(os.path.abspath(__file__))

CHAPTERS = [
    ("00", "00-overview", "전체 구조", ""),
    ("01", "01-local-setup", "로컬 환경", "setup"),
    ("02", "02-strapi-schema", "스키마", "schema"),
    ("03", "03-data-and-api", "데이터·API", "data"),
    ("04", "04-nextjs-page", "화면", "web"),
    ("05", "05-github-ci", "CI", "github"),
    ("06", "06-deploy", "CD·배포", "deploy"),
    ("07", "07-change-to-production", "변경을 운영까지", "change"),
    ("08", "08-summary", "정리", "deploy"),
]


def build(src_path, out_path, imgdir):
    src = open(src_path).read()

    def ex(m):
        path, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        lines = open(os.path.join(root, path)).read().split("\n")[a - 1 : b]
        ind = min((len(l) - len(l.lstrip(" ")) for l in lines if l.strip()), default=0)
        body = "\n".join(l[ind:] for l in lines)
        return f'<p class="file">{path}</p>\n<pre><code>{html.escape(body, quote=False)}</code></pre>'

    def img(m):
        f, cap = m.group(1), m.group(2)
        d = imgdir
        if "/" in f:  # 다른 폴더의 그림: {{IMG:폴더/파일|설명}}
            d, f = f.split("/", 1)
        return f'<figure><img src="../assets/img/{d}/{f}" alt="{html.escape(cap)}"><figcaption>{cap}</figcaption></figure>'

    def inc(m):
        return open(os.path.join(here, m.group(1))).read().rstrip("\n")

    def chmap(m):
        cur = m.group(1)
        items = []
        for no, file, name, _ in CHAPTERS:
            label = f"{no} {name}"
            if no == cur:
                items.append(f'<li class="on"><span>{label}</span></li>')
            else:
                items.append(f'<li><a href="{file}.html">{label}</a></li>')
        return '<ol class="chmap" aria-label="장 지도">' + "".join(items) + "</ol>"

    src = re.sub(r"\{\{INC:([^}]+)\}\}", inc, src)
    src = re.sub(r"\{\{EX:([^:}]+):(\d+):(\d+)\}\}", ex, src)
    src = re.sub(r"\{\{IMG:([^|}]+)\|([^}]+)\}\}", img, src)
    src = re.sub(r"\{\{MAP:(\d\d)\}\}", chmap, src)
    open(out_path, "w").write(src)
    left = [x for x in re.findall(r"\{\{[A-Z]+:[^}]+\}\}", src)]
    if left:
        print("남은 표시:", out_path, left)


if __name__ == "__main__":
    if sys.argv[1:] == ["--all"]:
        for no, file, _, imgdir in CHAPTERS:
            s = os.path.join(here, f"{no}.src.html")
            if os.path.exists(s):
                build(s, os.path.join(root, "docs/ko", f"{file}.html"), imgdir)
                print("built", file)
    else:
        build(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "deploy")
