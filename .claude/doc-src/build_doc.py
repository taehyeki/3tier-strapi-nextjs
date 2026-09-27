# 문서 틀(.src.html)의 {{EX:경로:시작:끝}}(저장소 파일의 줄 발췌)와 {{IMG:파일|설명}}을 채운다
# 사용: python3 .claude/doc-src/build_doc.py <틀> <출력 html> <이미지 폴더(docs/assets/img 아래)>
import re,html,sys,os
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 저장소 루트
src=open(sys.argv[1]).read()
imgdir=sys.argv[3] if len(sys.argv)>3 else 'deploy'  # 이미지 폴더 (docs/assets/img/<imgdir>)
def ex(m):
    path,a,b=m.group(1),int(m.group(2)),int(m.group(3))
    lines=open(os.path.join(root,path)).read().split('\n')[a-1:b]
    # 공통 들여쓰기 제거
    ind=min((len(l)-len(l.lstrip(' ')) for l in lines if l.strip()),default=0)
    body='\n'.join(l[ind:] for l in lines)
    return f'<p class="file">{path}</p>\n<pre><code>{html.escape(body,quote=False)}</code></pre>'
src=re.sub(r'\{\{EX:([^:}]+):(\d+):(\d+)\}\}',ex,src)
def img(m):
    f,cap=m.group(1),m.group(2)
    return f'<figure><img src="../assets/img/{imgdir}/{f}" alt="{html.escape(cap)}"><figcaption>{cap}</figcaption></figure>'
src=re.sub(r'\{\{IMG:([^|}]+)\|([^}]+)\}\}',img,src)
open(sys.argv[2],'w').write(src)
print("left markers:", re.findall(r'\{\{[^}]+\}\}',src))
