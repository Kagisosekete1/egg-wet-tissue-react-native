# Optional: regenerate compact full-length streams with ffmpeg. Original masters are never edited.
import pathlib,subprocess,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]/'assets/audio';out=root/'mobile';out.mkdir(exist_ok=True)
files=sorted(p for p in (root/'game-music').iterdir() if p.suffix in ['.mp3','.m4a'])
def convert(p):
 target=out/(p.stem+'.mp3')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(p),'-vn','-map_metadata','-1','-ac','1','-ar','44100','-codec:a','libmp3lame','-b:a','64k','-write_xing','0',str(target)],check=True)
 return p.stat().st_size,target.stat().st_size
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: sizes=list(pool.map(convert,files))
print('12 full-length streaming MP3s:',sum(a for a,b in sizes),'->',sum(b for a,b in sizes),'bytes')
