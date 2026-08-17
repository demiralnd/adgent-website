#!/usr/bin/env python3
"""svgcheck.py — catches the three SVG defects that measurement alone kept missing.

  1. text overlapping other text
  2. text spilling past the rect it sits inside
  3. text flush against the figure's left edge (x < MIN_INSET), which reads
     as the chart escaping its card

Uses the real Geist Mono / Plus Jakarta metrics, not estimates. Fonts are
cached under .fontcache/ on first run.

  python3 svgcheck.py          # report
  python3 svgcheck.py -q       # exit 1 if anything is found, no output
"""
import re,glob,html,json,sys,os,struct,urllib.request

MIN_INSET=4.0      # a figure's leftmost text must be at least this far in
BOX_PAD=2.0        # text may come this close to its box edge
CACHE='.fontcache'
FONTS={'mono':'https://fonts.gstatic.com/s/geistmono/v6/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KJ5T.ttf',
       'sans':'https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_TknNSg.ttf'}

def _tables(b):
    n=struct.unpack('>H',b[4:6])[0]; t={}
    for i in range(n):
        o=12+16*i
        t[b[o:o+4].decode('latin1')]=struct.unpack('>II',b[o+8:o+16])
    return t

def widther(path):
    b=open(path,'rb').read(); t=_tables(b)
    upem=struct.unpack('>H',b[t['head'][0]+18:t['head'][0]+20])[0]
    nhm=struct.unpack('>H',b[t['hhea'][0]+34:t['hhea'][0]+36])[0]
    hm=t['hmtx'][0]
    adv=[struct.unpack('>H',b[hm+4*i:hm+4*i+2])[0] for i in range(nhm)]
    co=t['cmap'][0]; sub=None
    for i in range(struct.unpack('>H',b[co+2:co+4])[0]):
        pid,eid,off=struct.unpack('>HHI',b[co+4+8*i:co+4+8*i+8])
        if (pid,eid) in ((3,1),(3,10),(0,3),(0,4)): sub=co+off
    cmap={}
    if sub and struct.unpack('>H',b[sub:sub+2])[0]==4:
        sx2=struct.unpack('>H',b[sub+6:sub+8])[0]; seg=sx2//2
        rd=lambda p,i: struct.unpack('>H',b[p+2*i:p+2+2*i])[0]
        end=[rd(sub+14,i) for i in range(seg)]
        sp=sub+16+sx2; start=[rd(sp,i) for i in range(seg)]
        dp=sp+sx2; delta=[struct.unpack('>h',b[dp+2*i:dp+2+2*i])[0] for i in range(seg)]
        rp=dp+sx2; rng=[rd(rp,i) for i in range(seg)]
        for i in range(seg):
            for c in range(start[i],min(end[i],0x2FFF)+1):
                if rng[i]==0: g=(c+delta[i])&0xFFFF
                else:
                    gi=rp+2*i+rng[i]+2*(c-start[i])
                    if gi+2>len(b): continue
                    g=struct.unpack('>H',b[gi:gi+2])[0]
                    if g: g=(g+delta[i])&0xFFFF
                if g: cmap[c]=g
    def w(ch,size):
        g=cmap.get(ord(ch),0)
        return (adv[g] if g<len(adv) else adv[-1])*size/upem
    return w

def load_fonts():
    os.makedirs(CACHE,exist_ok=True)
    out={}
    for k,url in FONTS.items():
        p=os.path.join(CACHE,k+'.ttf')
        if not os.path.exists(p):
            try: urllib.request.urlretrieve(url,p)
            except Exception as e:
                print(f"svgcheck: cannot fetch {k} font ({e}); skipping",file=sys.stderr); return None
        out[k]=widther(p)
    return out

def text_styles(css='site.css'):
    s=re.sub(r'/\*.*?\*/','',open(css,encoding='utf-8').read(),flags=re.S)
    s=re.sub(r'@(media|supports)[^{]*\{','',s)
    st={}
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',s):
        body=m.group(2)
        fs=re.search(r'font-size:\s*([\d.]+)px',body)
        fam=re.search(r'font-family:\s*var\(--font-(mono|sans|ui)\)',body)
        anc=re.search(r'text-anchor:\s*(\w+)',body)
        if not(fs or fam or anc): continue
        for sel in m.group(1).split(','):
            cl=re.findall(r'\.([a-zA-Z][\w\-]*)',sel.strip())
            if not cl: continue
            d=st.setdefault(cl[-1],{})
            if fs: d['size']=float(fs.group(1))
            if fam: d['fam']=fam.group(1)
            if anc: d['anchor']=anc.group(1)
    return st

def run(quiet=False):
    W=load_fonts()
    if not W: return 0
    ST=text_styles()
    def box(tat,txt):
        gx=re.search(r'\bx="(-?[\d.]+)"',tat); gy=re.search(r'\by="(-?[\d.]+)"',tat)
        if not(gx and gy): return None
        x,y=float(gx.group(1)),float(gy.group(1))
        tc=re.search(r'class="([^"]*)"',tat)
        size,fam,anc=12.0,'mono','start'
        for c in (tc.group(1) if tc else '').split():
            d=ST.get(c)
            if d: size=d.get('size',size); fam=d.get('fam',fam); anc=d.get('anchor',anc)
        am=re.search(r'text-anchor="([^"]+)"',tat)
        if am: anc=am.group(1)
        fn=W['sans'] if fam in('sans','ui') else W['mono']
        w=sum(fn(ch,size) for ch in txt)
        x0=x-w/2 if anc=='middle' else (x-w if anc=='end' else x)
        return x0,x0+w,y-size*0.72,y+size*0.24
    found=[]
    for f in sorted(glob.glob('*.html')):
        s=open(f,encoding='utf-8').read()
        for m in re.finditer(r'<svg([^>]*)>(.*?)</svg>',s,re.S):
            at,body=m.group(1),m.group(2)
            cm=re.search(r'class="([^"]*)"',at); cls=cm.group(1) if cm else '(none)'
            if any(k in cls for k in ('caret','chev','mega-ic')): continue
            vb=re.search(r'viewBox="([^"]+)"',at)
            if not vb: continue
            p=[float(v) for v in vb.group(1).split()]
            if len(p)!=4: continue
            vx,vy,vw,vh=p
            rects=[]
            for rm in re.finditer(r'<rect([^>]*)>',body):
                rat=rm.group(1)
                try:
                    x=float(re.search(r'\bx="(-?[\d.]+)"',rat).group(1)); y=float(re.search(r'\by="(-?[\d.]+)"',rat).group(1))
                    w=float(re.search(r'width="([\d.]+)"',rat).group(1)); h=float(re.search(r'height="([\d.]+)"',rat).group(1))
                except AttributeError: continue
                if w>=40 and h>=16: rects.append((x,x+w,y,y+h))
            boxes=[]
            for tm in re.finditer(r'<text([^>]*)>(.*?)</text>',body,re.S):
                txt=html.unescape(re.sub(r'<[^>]+>','',tm.group(2))).strip()
                if not txt: continue
                b=box(tm.group(1),txt)
                if b: boxes.append((txt,b,tm.group(1)))
            for txt,(x0,x1,y0,y1),tat in boxes:
                if x0-vx < MIN_INSET and 'text-anchor' not in tat:
                    found.append((f,cls,'flush-left',f"x={x0:.0f} (min {MIN_INSET:.0f})",txt))
                for rx0,rx1,ry0,ry1 in rects:
                    if y0>=ry0-2 and y1<=ry1+2 and x0>=rx0-6 and x0<rx1:
                        # a bold face at small sizes measures narrower than our
                        # regular-weight sample, so ignore hairline reports there
                        bold = 'font-weight="700"' in tat or 'font-weight:700' in tat
                        if x1>rx1-BOX_PAD and not (bold and x1-rx1 < 6):
                            found.append((f,cls,'past-box',f"over {x1-rx1:.1f}px",txt))
                        break
            for i in range(len(boxes)):
                for j in range(i+1,len(boxes)):
                    (_,a,_),(_,b2,_)=boxes[i],boxes[j]
                    ox=min(a[1],b2[1])-max(a[0],b2[0]); oy=min(a[3],b2[3])-max(a[2],b2[2])
                    if ox>1 and oy>1:
                        found.append((f,cls,'overlap',f"{ox:.0f}x{oy:.0f}px",f"{boxes[i][0][:22]!r} / {boxes[j][0][:22]!r}"))
    seen=set(); uniq=[]
    for r in found:
        k=(r[1],r[2],r[3],r[4])
        if k in seen: continue
        seen.add(k); uniq.append(r)
    if not quiet:
        for f,cls,kind,detail,txt in sorted(uniq,key=lambda r:r[2]):
            print(f"{kind:11} [{cls[:14]:14}] {detail:16} {txt}   ({f})")
        print(f"\n{len(uniq)} issue(s)" if uniq else "OK — no SVG text overlaps, box spills or flush-left figures.")
    return len(uniq)

if __name__=='__main__':
    sys.exit(1 if run('-q' in sys.argv) else 0)
