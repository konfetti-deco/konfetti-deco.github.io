import sys,os,shutil,datetime
src='src/'
site='--site' in sys.argv
files=['data.js','engine.js','model.js','plancore.js','photo.js','scene.js','ui.js','views.js','plan.js','photos.js','report.js','io.js']+(['site.js'] if site else [])+['main.js']
js='\n'.join(open(src+f,encoding='utf-8').read() for f in files)
css=open(src+'style.css',encoding='utf-8').read()
assert '</script' not in js.lower() and '</style' not in css.lower()
html=open(src+'index.tpl.html',encoding='utf-8').read().replace('/*CSS*/',css).replace('/*JS*/','(function(){"use strict";\n'+js+'\n})();' if '--iife' in sys.argv else js)
if not site:
    open('dist/konstruktor-fotozon.html','w',encoding='utf-8').write(html)
    print('built',len(html),'bytes')
else:
    # the stand-alone site (GitHub Pages): a full document with the home-screen icon, manifest and offline cache
    out=(sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else '../konfetti-deco.github.io/');build=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M')
    if os.path.isdir(out):
        for n in os.listdir(out):
            if n!='.git':
                pth=os.path.join(out,n);shutil.rmtree(pth) if os.path.isdir(pth) else os.remove(pth)
    os.makedirs(out,exist_ok=True)
    head=('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
      '<meta name="theme-color" content="#2A2C2F">\n<meta name="description" content="Konfetti Deco — конструктор фотозон: сцена, смета, чертежи и предложение клиенту">\n'
      '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" type="image/png" href="icons/favicon-64.png">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n'
      '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
      '<meta name="apple-mobile-web-app-title" content="Konfetti Deco">\n')
    i=html.index('<title>');j=html.index('</title>')+8
    doc=head+html[i:j]+'\n'+html[j:].replace('<div class="ws" id="ws">','</head>\n<body>\n<div class="ws" id="ws">',1)+'\n</body>\n</html>\n'
    # the app lives at the root of its own repository (github.io/konfetti/): a scope no earlier installation ever had
    open(out+'index.html','w',encoding='utf-8').write(doc)
    shutil.copytree('site_src/icons',out+'icons')
    shutil.copy('site_src/manifest.webmanifest',out+'manifest.webmanifest')
    open(out+'sw.js','w',encoding='utf-8').write(open('site_src/sw.js',encoding='utf-8').read().replace('__BUILD__',build))
    os.makedirs(out+'.github/workflows',exist_ok=True);shutil.copy('site_src/.github/workflows/deploy.yml',out+'.github/workflows/deploy.yml')
    if os.path.exists('site_src/README.md'):shutil.copy('site_src/README.md',out+'README.md')
    open(out+'.nojekyll','w').write('')
    # the old address (github.io/konfetti-deco/ and its app/): a forwarding page and a worker that removes the old offline cache
    for old,subs in (('site/',('','app/')),('../konfetti/',('',))):
        if not os.path.isdir(old+'.git'):continue
        for n in os.listdir(old):
            if n!='.git':
                pth=os.path.join(old,n);shutil.rmtree(pth) if os.path.isdir(pth) else os.remove(pth)
        for d in subs:
            d=old+d;os.makedirs(d,exist_ok=True)
            open(d+'index.html','w',encoding='utf-8').write(open('site_src/moved/index.html',encoding='utf-8').read())
            open(d+'sw.js','w',encoding='utf-8').write(open('site_src/moved/sw.js',encoding='utf-8').read())
            shutil.copytree('site_src/icons',d+'icons')
        os.makedirs(old+'.github/workflows',exist_ok=True);shutil.copy('site_src/.github/workflows/deploy.yml',old+'.github/workflows/deploy.yml')
        shutil.copy('site_src/moved/README.md',old+'README.md');open(old+'.nojekyll','w').write('')
    # the sources travel with the site, so the next change can be built from them
    shutil.copytree('src',out+'source/src');shutil.copy('build.py',out+'source/build.py');shutil.copytree('site_src',out+'source/site_src')
    # tests travel too: a lost workspace can be rebuilt from the repository (browser tests go back into tmp/)
    if os.path.isdir('test'):shutil.copytree('test',out+'source/test',dirs_exist_ok=True)
    import glob;os.makedirs(out+'source/e2e',exist_ok=True)
    for f in glob.glob('tmp/e2e*.js')+['tmp/hall_test.jpg','tmp/runbg.sh']:
        if os.path.exists(f):shutil.copy(f,out+'source/e2e/'+os.path.basename(f))
    print('site built',len(doc),'bytes, build',build)
