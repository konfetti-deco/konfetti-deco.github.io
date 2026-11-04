/* ===== data.js — catalog, palettes, holiday kits, default prices ===== */
var D = {};

D.PALETTES = [
  {id:'emerald', name:'Изумруд и латунь',        c:['#2F6B55','#1F4D3F','#3C7460','#6E9A88'], ins:'#A3BDAF', ink:'#E9D49A', bal:['#1F4D3F','#3C7460','#9DBBAC','#F1E9DC','#C9A857']},
  {id:'ochre',   name:'Тёплая охра и золото',    c:['#B9684A','#E3C9A3','#C98A5A','#DDB07E'], ins:'#F0DFC4', ink:'#FFF3D6', bal:['#B9684A','#C98A5A','#E3C9A3','#F4EBDD','#CFA549']},
  {id:'bordeaux',name:'Бордо и розовое золото',  c:['#A5566B','#7A2338','#C98A93','#E3BABD'], ins:'#D9A9AE', ink:'#FFE9D6', bal:['#7A2338','#5B1427','#C98A93','#F1D5D2','#D9A98C']},
  {id:'onyx',    name:'Чёрный оникс и золото',   c:['#2A2B2E','#17181A','#1F4A3D','#3A3B3E'], ins:'#4A4B4F', ink:'#F0D48A', bal:['#17181A','#1F4A3D','#3A3B3E','#EDE6D6','#D4B05A']},
  {id:'pastel',  name:'Нежная пастель',          c:['#C9DCE8','#EAD3CF','#F3E6E1','#F2D6DA'], ins:'#FBF4F0', ink:'#B48A6A', bal:['#C9DCE8','#F2D6DA','#EAD3CF','#FBF6F0','#CDB48A']},
  {id:'xmas',    name:'Рождественский красный',  c:['#A8323A','#7A1F26','#2F4D3A','#CDBBA3'], ins:'#E4D8C6', ink:'#F4DFA0', bal:['#A8323A','#7A1F26','#2F4D3A','#F1E9DC','#CFA549']},
  {id:'pumpkin', name:'Тыква и полночь',         c:['#3A2A52','#17181A','#C8531C','#5B4380'], ins:'#6A548F', ink:'#FFB45C', bal:['#C8531C','#17181A','#3A2A52','#5B4380','#CFA549']},
  {id:'navy',    name:'Синий и золото',          c:['#22346E','#0F1B3D','#2F4A8C','#8FA6D6'], ins:'#B5C3E4', ink:'#EBD08A', bal:['#0F1B3D','#22346E','#8FA6D6','#F4F1EA','#C9A24B']},
  {id:'silver',  name:'Серебро и белый',         c:['#C9CED6','#AEB6C2','#E4E7EC','#DDE2E8'], ins:'#F3F5F8', ink:'#5F6B7C', bal:['#AEB6C2','#C9CED6','#E4E7EC','#FFFFFF','#B9BEC7']}
];
D.pal = function(id){for(var i=0;i<D.PALETTES.length;i++)if(D.PALETTES[i].id===id)return D.PALETTES[i];return D.PALETTES[0]};

/* element catalog: tap a tile to add it to the scene */
D.GROUPS = [
  {id:'bg', name:'Фоны', items:[
    {t:'arch',  name:'Арка',               d:{w:1500,h:2400}},
    {t:'arch',  name:'Арка малая',         d:{w:600,h:1200}},
    {t:'arch',  name:'Полукруг',           d:{w:1600,h:800}},
    {t:'portal',name:'Портал с нишей',     d:{w:1200,h:2000,nw:700,nh:1500,ny:150,insert:'slats'}},
    {t:'uarch', name:'Открытая арка',      d:{w:1000,h:2100,t:160}},
    {t:'harch', name:'Полуарка',           d:{w:1100,h:2200,r:1100}},
    {t:'harch', name:'Полуарка левая',     d:{w:1100,h:2200,r:1100,flip:true}},
    {t:'rect',  name:'Прямоугольник',      d:{w:1500,h:2200,r:0}},
    {t:'rect',  name:'Квадрат',            d:{w:1500,h:1500,r:0}},
    {t:'rect',  name:'Скруглённая панель', d:{w:1200,h:2000,r:220}},
    {t:'circle',name:'Круг',               d:{w:1800,h:1800}},
    {t:'rect',  name:'Пайетки · золото',   d:{w:1200,h:2400,r:0,surf:'sequin',seq:'gold'}},
    {t:'rect',  name:'Пайетки · серебро',  d:{w:1200,h:2400,r:0,surf:'sequin',seq:'silver'}},
    {t:'rect',  name:'Пайетки · розовый',  d:{w:1200,h:2400,r:0,surf:'sequin',seq:'pink'}},
    {t:'rect',  name:'Пайетки · хамелеон', d:{w:1200,h:2400,r:0,surf:'sequin',seq:'cham'}},
    {t:'rect',  name:'Фольга · серебро',   d:{w:1200,h:2400,r:0,surf:'foil',seq:'silver'}},
    {t:'rect',  name:'Фольга · золото',    d:{w:1200,h:2400,r:0,surf:'foil',seq:'gold'}},
    {t:'rect',  name:'Стена из зелени',    d:{w:1200,h:2400,r:0,surf:'greens'}},
    {t:'arch',  name:'Арка из зелени',     d:{w:1200,h:2300,surf:'greens'}}
  ]},
  {id:'air', name:'Шары', items:[
    {t:'garland',name:'Гирлянда · асимметрия',d:{w:2300,h:2500,shape:'asym'}},
    {t:'garland',name:'Гирлянда · арка',      d:{w:2600,h:2500,shape:'arc'}},
    {t:'garland',name:'Гирлянда · угол',      d:{w:1300,h:1400,shape:'corner'}},
    {t:'garland',name:'Гирлянда · колонна',   d:{w:520,h:2200,shape:'column'}},
    {t:'cluster',name:'Кластер шаров',        d:{w:800,h:560}},
    {t:'balloon',name:'Шар матовый',       d:{size:12,fin:'latex'}},
    {t:'balloon',name:'Хром золото',       d:{size:12,fin:'chrome',color:'#D4AF37'}},
    {t:'balloon',name:'Хром серебро',      d:{size:12,fin:'chrome',color:'#C4C8CF'}},
    {t:'balloon',name:'Прозрачный',        d:{size:18,fin:'clear',string:true}},
    {t:'foil',name:'Фольга · цифра',  d:{kind:'digit',text:'1',size:40,color:'#D4AF37'}},
    {t:'foil',name:'Фольга · буква',  d:{kind:'letter',text:'A',size:40,color:'#C4C8CF'}},
    {t:'foil',name:'Фольга · звезда', d:{kind:'star',size:18,color:'#D4AF37',string:true}},
    {t:'foil',name:'Фольга · сердце', d:{kind:'heart',size:18,color:'#E0607E',string:true}},
    {t:'foil',name:'Фольга · сфера',  d:{kind:'round',size:18,color:'#C4C8CF',string:true}}
  ]},
  {id:'flora', name:'Цветы и ткань', items:[
    {t:'flora',name:'Цветы · угол',      d:{kind:'flowers',w:1300,h:1400,shape:'corner'}},
    {t:'flora',name:'Цветы · арка',      d:{kind:'flowers',w:2400,h:2400,shape:'arc'}},
    {t:'flora',name:'Цветы · колонна',   d:{kind:'flowers',w:450,h:1800,shape:'column'}},
    {t:'flora',name:'Букет на полу',     d:{kind:'flowers',w:700,h:520,shape:'pile'}},
    {t:'flora',name:'Зелень · ветви',    d:{kind:'greens',w:2300,h:2500,shape:'asym'}},
    {t:'flora',name:'Гортензии · угол',  d:{kind:'flowers',w:1300,h:1100,shape:'corner',fl:'hydrangea',leaf:'goldmix',cols:['#24336E','#3A4F9A','#C9A857']}},
    {t:'flora',name:'Гортензии · букет', d:{kind:'flowers',w:600,h:420,shape:'pile',fl:'hydrangea',leaf:'goldmix',cols:['#24336E','#3A4F9A','#C9A857']}},
    {t:'flora',name:'Розы · колонна',    d:{kind:'flowers',w:450,h:1800,shape:'column',fl:'rose',leaf:'green'}},
    {t:'flora',name:'Пионы · букет',     d:{kind:'flowers',w:700,h:500,shape:'pile',fl:'peony',leaf:'euca'}},
    {t:'flora',name:'Золотые листья',    d:{kind:'greens',w:1400,h:1200,shape:'corner',leaf:'gold'}},
    {t:'flora',name:'Папоротник',        d:{kind:'greens',w:1400,h:1200,shape:'corner',leaf:'fern'}},
    {t:'drape',name:'Тканевый фон · бархат',d:{kind:'backdrop',w:3000,h:2400,color:'#1E2B63',fab:'velvet'}},
    {t:'drape',name:'Тканевый фон · атлас', d:{kind:'backdrop',w:3000,h:2400,color:'#EFE3D3',fab:'satin'}},
    {t:'drape',name:'Тканевый фон · шифон', d:{kind:'backdrop',w:3000,h:2400,color:'#FFFFFF',fab:'chiffon'}},
    {t:'drape',name:'Драпировка сверху', d:{kind:'swag',w:2600,h:1500,color:'#F4E9EC'}},
    {t:'drape',name:'Шторы по бокам',    d:{kind:'curtain',w:2800,h:2600,color:'#F4E9EC'}},
    {t:'drape',name:'Вуаль на фон',      d:{kind:'veil',w:1500,h:2400,color:'#FFFFFF'}},
    {t:'drape',name:'Штора с подхватом слева', d:{kind:'tie',w:1600,h:2600,color:'#CFC9BE',fab:'satin',tb:'band',pts:[[.62,0],[.1,.56],[.3,1]]}},
    {t:'drape',name:'Штора с подхватом справа',d:{kind:'tie',w:1600,h:2600,color:'#CFC9BE',fab:'satin',tb:'band',pts:[[.38,0],[.9,.56],[.7,1]]}},
    {t:'drape',name:'Свес с узлом слева', d:{kind:'tie',w:1800,h:2600,color:'#C2185B',fab:'satin',tb:'knot',pts:[[1,.3],[.12,.42],[.62,1]]}},
    {t:'drape',name:'Свес с узлом справа',d:{kind:'tie',w:1800,h:2600,color:'#1E2B63',fab:'velvet',tb:'knot',pts:[[0,.3],[.88,.42],[.38,1]]}},
    {t:'drape',name:'Две шторы с подхватами',d:{kind:'tie2',w:2800,h:2600,color:'#6B1F2E',fab:'velvet',tb:'band',pts:[[.42,0],[.06,.55],[.2,1],[.58,0],[.94,.55],[.8,1]]}},
    {t:'drape',name:'Асимметричный свес',d:{kind:'tie',w:2000,h:2600,color:'#F4E9EC',fab:'chiffon',tb:'none',pts:[[1,.12],[.06,.86],[.42,1]]}}
  ]},
  {id:'text', name:'Надписи', items:[
    {t:'text',name:'Неон',           d:{text:'HAPPY\nBIRTHDAY',size:150,style:'neon',font:'serif'}},
    {t:'text',name:'Золотые буквы',  d:{text:'LOVE',size:260,style:'gold',font:'serif'}},
    {t:'text',name:'Рукописный неон',d:{text:'С днём рождения',size:170,style:'neon',font:'script'}},
    {t:'text',name:'Плоская надпись',d:{text:'ИМЯ',size:180,style:'flat',font:'sans'}},
    {t:'text',name:'Неон на стойке', d:{text:'Happy\nBirthday',size:150,style:'neon',font:'script',stand:'floor'}},
    {t:'text',name:'Светящиеся буквы',d:{text:'LOVE',size:900,style:'marquee',font:'sans'}},
    {t:'text',name:'Каллиграфия золотом',d:{text:'Chanukka\nSameach',size:230,style:'gold',font:'vibes'}}
  ]},
  {id:'neon', name:'Неон', items:[
    {t:'neon',name:'Неон · круг',          d:{kind:'ring',w:900,h:900,color:'#FF5FA2'}},
    {t:'neon',name:'Неон · дуга',          d:{kind:'ring',w:1400,h:1400,arc:180,color:'#FFE3A6'}},
    {t:'neon',name:'Неон · прямоугольник', d:{kind:'rect',w:1200,h:800,r:60,color:'#8FD3FF'}},
    {t:'neon',name:'Неон · полоса',        d:{kind:'line',w:1500,h:200,pts:[[0,.5],[.34,.5],[.67,.5],[1,.5]],color:'#B36BFF'}},
    {t:'neon',name:'Неон · волна',         d:{kind:'line',w:1500,h:400,pts:[[0,.7],[.25,.15],[.5,.7],[.75,.15],[1,.7]],color:'#39E58C'}}
  ]},
  {id:'sym', name:'Символы', items:[
    {t:'sym',name:'Ханукия',        d:{kind:'hanukkiah',w:750,mount:'floor'}},
    {t:'sym',name:'Звезда Давида',  d:{kind:'magen',w:220,mount:'wall'}},
    {t:'sym',name:'Звезда напольная',d:{kind:'magen',w:600,mount:'floor'}},
    {t:'sym',name:'Звезда',         d:{kind:'star',w:260,mount:'wall'}},
    {t:'sym',name:'Сердце',         d:{kind:'heart',w:320,mount:'wall'}},
    {t:'sym',name:'Кольца',         d:{kind:'rings',w:420,mount:'wall'}},
    {t:'sym',name:'Полумесяц',      d:{kind:'moon',w:520,mount:'wall'}},
    {t:'sym',name:'Снежинка',       d:{kind:'snow',w:260,mount:'wall'}},
    {t:'sym',name:'Облако',         d:{kind:'cloud',w:520,mount:'wall'}},
    {t:'sym',name:'Ёлка',           d:{kind:'tree',w:800,mount:'floor'}},
    {t:'sym',name:'Тыква',          d:{kind:'pumpkin',w:420,mount:'floor'}},
    {t:'sym',name:'Цифра',          d:{kind:'digit',w:520,mount:'floor',text:'5'}},
    {t:'sym',name:'Ракушка',        d:{kind:'shell',w:900,mount:'floor'}},
    {t:'sym',name:'Морская звезда', d:{kind:'starfish',w:520,mount:'floor'}},
    {t:'sym',name:'Неон · подарок',  d:{kind:'ngift',w:340,mount:'wall',color:'#FFE3A6'}},
    {t:'sym',name:'Неон · сердце',   d:{kind:'nheart',w:380,mount:'wall',color:'#FF8FB1'}},
    {t:'sym',name:'Неон · звезда',   d:{kind:'nstar',w:360,mount:'wall',color:'#FFE3A6'}},
    {t:'sym',name:'Неон · звезда Давида',d:{kind:'nmagen',w:380,mount:'wall',color:'#8FD3FF'}},
    {t:'sym',name:'Неон · полумесяц',d:{kind:'nmoon',w:380,mount:'wall',color:'#FFE3A6'}}
  ]},
  {id:'stand', name:'Тумбы и мольберты', items:[
    {t:'prop',name:'Тумба-цилиндр',  d:{kind:'plc',w:400,h:900}},
    {t:'prop',name:'Тумба прямоугольная',d:{kind:'plq',w:400,h:900}},
    {t:'prop',name:'Тумбы-цилиндры', d:{kind:'plinths',w:900}},
    {t:'prop',name:'Рама-куб металлическая',d:{kind:'mframe',w:450,h:600,color:'#C9A857'}},
    {t:'prop',name:'Рама со стеклом', d:{kind:'mglass',w:450,h:800,color:'#C9A857'}},
    {t:'prop',name:'Каркасный цилиндр',d:{kind:'mcyl',w:450,h:700,color:'#C9A857'}},
    {t:'prop',name:'Набор рам · 3 высоты',d:{kind:'mset',w:1100,h:900,color:'#C9A857'}},
    {t:'prop',name:'Рама-куб с крышкой',d:{kind:'mframe',w:450,h:700,color:'#C9A857',lid:'panel',lc:'#FFFFFF'}},
    {t:'prop',name:'Рама с зеркальным верхом',d:{kind:'mglass',w:450,h:850,color:'#C9A857',lid:'mirror'}},
    {t:'prop',name:'Рама с мраморным верхом',d:{kind:'mframe',w:500,h:750,color:'#1B1D1F',lid:'marble'}},
    {t:'prop',name:'Цилиндр с крышкой',d:{kind:'mcyl',w:450,h:750,color:'#C9A857',lid:'panel',lc:'#FFFFFF'}},
    {t:'prop',name:'Набор рам с крышками',d:{kind:'mset',w:1100,h:900,color:'#C9A857',lid:'panel',lc:'#FFFFFF'}},
    {t:'prop',name:'Подиум круглый', d:{kind:'podr',w:900,h:400}},
    {t:'prop',name:'Подиум прямоугольный',d:{kind:'podq',w:1200,h:350}},
    {t:'prop',name:'Мольберт деревянный',d:{kind:'easel',w:620,h:1680,design:'wood',text:'Welcome'}},
    {t:'prop',name:'Мольберт золотой',d:{kind:'easel',w:560,h:1600,design:'gold',board:'arch',text:'Welcome',color:'#1E2B63',flw:true}},
    {t:'prop',name:'Мольберт чёрный', d:{kind:'easel',w:560,h:1600,design:'black',board:'round',text:'Welcome'}},
    {t:'prop',name:'Мольберт настольный',d:{kind:'easel',w:380,h:520,design:'table',text:'Welcome',color:'#1E2B63',flw:true}},
    {t:'prop',name:'Сладкий стол',   d:{kind:'table',w:1600,h:1350}}
  ]},
  {id:'gift', name:'Подарки и свечи', items:[
    {t:'prop',name:'Подарки · набор 3',d:{kind:'gifts',w:560}},
    {t:'prop',name:'Коробка-куб',     d:{kind:'gift',shape:'cube',w:320,h:300,color:'#1E2B63',rib:'#C9A857'}},
    {t:'prop',name:'Высокая коробка', d:{kind:'gift',shape:'tall',w:260,h:420,color:'#C9A857',rib:'#1E2B63'}},
    {t:'prop',name:'Плоская коробка', d:{kind:'gift',shape:'flat',w:420,h:180,color:'#1E2B63',rib:'#C9A857',pat:'geo'}},
    {t:'prop',name:'Шляпная коробка', d:{kind:'gift',shape:'round',w:340,h:260,color:'#F2D6DA',rib:'#C9A857'}},
    {t:'prop',name:'Гора подарков',   d:{kind:'giftpile',w:1400,h:520,n:12,color:'#1E2B63',rib:'#C9A857'}},
    {t:'prop',name:'LED-свечи',       d:{kind:'candles',w:300}},
    {t:'prop',name:'Канделябр',       d:{kind:'candelabra',w:420,n:5,color:'#C9A857'}},
    {t:'prop',name:'Подсвечники · набор',d:{kind:'csticks',w:420,n:5,color:'#C9A857'}},
    {t:'prop',name:'Фонарь со свечой',d:{kind:'lantern',w:240,color:'#C9A857'}}
  ]},
  {id:'prop', name:'Реквизит', items:[
    {t:'prop',name:'Дрейдл',         d:{kind:'dreidel',w:330}},
    {t:'prop',name:'Ваза с пампасом',d:{kind:'pampas',w:520}}
  ]},
  {id:'people', name:'Люди для масштаба', items:[
    {t:'person',name:'Мужчина · 180 см',d:{kind:'man'}},
    {t:'person',name:'Женщина · 160 см',d:{kind:'woman'}},
    {t:'person',name:'Ребёнок · 116 см',d:{kind:'child'}}
  ]},
  {id:'pic', name:'Картинки', items:[]}
];
/* figures of people to judge the scale: real height in mm, width / height of the silhouette. Not decor: kept out of the estimate and the checks. */
D.PERSON = {man:{name:'Мужчина',h:1800,ar:.31},woman:{name:'Женщина',h:1600,ar:.30},child:{name:'Ребёнок',h:1160,ar:.33}};
D.PERSON_COL = '#5E6A72';
/* height / width for symbols and props */
D.ASPECT = {hanukkiah:1.2,magen:1.155,star:.95,heart:.92,rings:.62,moon:1,snow:1,cloud:.6,tree:1.75,pumpkin:.86,digit:1.5,
            gifts:.62,candles:.95,dreidel:1.27,plinths:.95,pampas:2.2,shell:.86,starfish:.95,podr:.45,podq:.3,plc:2.25,plq:2.25,easel:2.7,table:.84,
            mframe:1.33,mglass:1.78,mcyl:1.55,mset:.82,gift:.94,giftpile:.37,candelabra:1.35,csticks:1.5,lantern:1.9,ngift:1.05,nheart:.92,nstar:.95,nmagen:1.155,nmoon:1};
D.FREE_H = {podr:1,podq:1,plc:1,plq:1,table:1,mframe:1,mglass:1,mcyl:1,mset:1,gift:1,giftpile:1,easel:1};                      // props whose height is set separately from the width
D.BSIZE = {5:130,10:250,12:300,18:450,24:600,36:900};  // balloon size in inches -> diameter, mm
D.FIN_NAME = {latex:'Матовый',chrome:'Хром',clear:'Прозрачный'};
/* neon shapes on flexible neon: tube [name, width of the light face in mm, price key] */
D.NEON_KIND = {ring:'Круг',rect:'Прямоугольник',line:'Полоса'};
D.NEON_TUBE = {s:['6×12 мм',6,'neon_m6'],l:['8×16 мм',8,'neon_m8']};
D.NEON_GLOW = ['Без свечения','Слабое','Среднее','Сильное'];
D.NEON_BASE = {clips:'Клипсы на фон',acrylic:'Прозрачный акрил'};
D.NEON_COLS = [['#FFE3A6','Тёплый белый'],['#F4F7FF','Холодный белый'],['#FF5FA2','Розовый'],['#FF3B3B','Красный'],['#FF8A3B','Оранжевый'],['#FFD23B','Жёлтый'],['#39E58C','Зелёный'],['#8FD3FF','Ледяной'],['#3BA3FF','Синий'],['#B36BFF','Фиолетовый']];
D.SEQ = {gold:{name:'Золото',c:'#D4AF37'},silver:{name:'Серебро',c:'#C9CDD4'},pink:{name:'Розовый',c:'#E9A3B7'},cham:{name:'Хамелеон',c:'#CDB4F0'},custom:{name:'Свой цвет',c:'#D4AF37'}};
D.TYPE_NAME = {neon:'Неон',foil:'Фольгированный шар',flora:'Цветы',drape:'Ткань',arch:'Арка',portal:'Портал с нишей',uarch:'Открытая арка',harch:'Полуарка',rect:'Панель',balloon:'Шар',pic:'Картинка',circle:'Круг',garland:'Гирлянда',cluster:'Кластер шаров',text:'Надпись',sym:'Символ',prop:'Реквизит'};
D.KIND_NAME = {hanukkiah:'Ханукия',magen:'Звезда Давида',star:'Звезда',heart:'Сердце',rings:'Кольца',moon:'Полумесяц',snow:'Снежинка',cloud:'Облако',tree:'Ёлка',pumpkin:'Тыква',digit:'Цифра',
               gifts:'Подарочные коробки',candles:'LED-свечи',dreidel:'Дрейдл',plinths:'Тумбы-цилиндры',pampas:'Ваза с пампасом',
               shell:'Ракушка',starfish:'Морская звезда',podr:'Подиум круглый',podq:'Подиум прямоугольный',plc:'Тумба-цилиндр',plq:'Тумба прямоугольная',mframe:'Тумба-рама металлическая',mglass:'Тумба-рама со стеклом',mcyl:'Каркасная тумба-цилиндр',mset:'Набор тумб-рам',gift:'Подарочная коробка',giftpile:'Гора подарков',candelabra:'Канделябр',csticks:'Подсвечники',lantern:'Фонарь со свечой',ngift:'Неон «подарок»',nheart:'Неон «сердце»',nstar:'Неон «звезда»',nmagen:'Неон «звезда Давида»',nmoon:'Неон «полумесяц»',easel:'Стойка-приветствие',table:'Сладкий стол'};
/* fonts of inscriptions: family, weight, group, whether it has Cyrillic letters (checked against the font files), width factor for the first guess */
D.FONT_LIST = [
  ['serif','Cormorant Garamond','Cormorant',600,'serif',1,.5],['playfair','Playfair Display','Playfair',700,'serif',1,.56],['prata','Prata','Prata',400,'serif',1,.55],['forum','Forum','Forum',400,'serif',1,.48],['cinzel','Cinzel','Cinzel',700,'serif',0,.66],
  ['sans','Onest','Onest',600,'sans',1,.56],['mont','Montserrat','Montserrat',700,'sans',1,.62],['comfortaa','Comfortaa','Comfortaa',700,'sans',1,.6],['amatic','Amatic SC','Amatic',700,'sans',1,.36],
  ['script','Marck Script','Marck Script',400,'script',1,.42],['vibes','Great Vibes','Great Vibes',400,'script',1,.4],['badscript','Bad Script','Bad Script',400,'script',1,.46],['caveat','Caveat','Caveat',700,'script',1,.42],
  ['pacifico','Pacifico','Pacifico',400,'script',1,.55],['lobster','Lobster','Lobster',400,'script',1,.45],['alex','Alex Brush','Alex Brush',400,'script',0,.4],['paris','Parisienne','Parisienne',400,'script',0,.42],['pinyon','Pinyon Script','Pinyon',400,'script',0,.44]
];
D.FONTS={};D.FONT_NAME={};D.FONT_W={};D.FONT_CYR={};D.FONT_K={};D.FONT_SCRIPT={};
D.FONT_LIST.forEach(function(f){var fb=f[4]==='serif'?"Georgia, serif":f[4]==='sans'?"Arial, sans-serif":"'Brush Script MT', cursive";D.FONTS[f[0]]="'"+f[1]+"', "+fb;D.FONT_NAME[f[0]]=f[2];D.FONT_W[f[0]]=f[3];D.FONT_CYR[f[0]]=!!f[5];D.FONT_K[f[0]]=f[6];if(f[4]==='script')D.FONT_SCRIPT[f[0]]=1});
D.FONT_GROUP = {serif:'С засечками',sans:'Без засечек',script:'Рукописные'};
D.STYLE_NAME = {neon:'Неон',gold:'Золотые буквы',flat:'Плоская',marquee:'Светящиеся буквы'};
D.STAND_NAME = {floor:'стойка до пола',table:'настольная подставка'};
D.GSHAPE_NAME = {asym:'Асимметрия',arc:'Арка',corner:'Угол',column:'Колонна',free:'Своя форма'};
D.FOIL_NAME = {digit:'цифра',letter:'буква',star:'звезда',heart:'сердце',round:'сфера'};
D.FOIL_SIZES = {digit:[16,32,40],letter:[16,32,40],star:[18,32],heart:[18,32],round:[18]};
D.FOIL_H = {16:400,18:450,32:800,40:1000};
D.BFIN_NAME = {latex:'Матовый',chrome:'Хром',pearl:'Перламутр',confetti:'С конфетти'};
D.FLORA_NAME = {flowers:'Цветы',greens:'Зелень'};
D.DRAPE_NAME = {backdrop:'Тканевый фон',swag:'Драпировка сверху',curtain:'Шторы по бокам',veil:'Вуаль',tie:'Штора с подхватом',tie2:'Две шторы с подхватами'};
/* shape points of a tied curtain, fractions of its box: the end of the free edge (top or right side), the tieback, the tip of the train on the floor */
D.TIE_PTS = {tie:[[.62,0],[.1,.56],[.3,1]],tie2:[[.42,0],[.06,.55],[.2,1],[.58,0],[.94,.55],[.8,1]]};
D.TIE_NAME = {band:'Лента',knot:'Узел',none:'Без подхвата'};
D.FAB = {chiffon:['Шифон или вуаль',3,'fabric'],satin:['Атлас',1.5,'fab_satin'],velvet:['Бархат',1.45,'fab_velvet']};   // name, roll width m, price key
D.FL_NAME = {mix:'Розы и пионы',rose:'Розы',peony:'Пионы',hydrangea:'Гортензии'};
D.LEAF_NAME = {green:'Зелёные листья',euca:'Эвкалипт',fern:'Папоротник',gold:'Золотые листья',goldmix:'Зелёные и золотые'};
D.EASEL_NAME = {wood:'Деревянный',gold:'Золотой металл',black:'Чёрный металл',table:'Настольный'};
D.EASEL_H = {wood:2.7,gold:2.85,black:2.85,table:1.37};
D.GIFT_SHAPE = {cube:['Куб',.94],tall:['Высокая',1.6],flat:['Плоская',.43],round:['Шляпная',.76]};
D.LID_NAME = {open:'Открытый',panel:'Крышка',mirror:'Зеркало',marble:'Мрамор',wood:'Дерево'};
D.GIFT_PAT = {plain:'Гладкая',stripes:'Полоски',dots:'Горох',geo:'Геометрия'};
D.MIX_NAME = {mix:'Микс',big:'Крупные',small:'Мелкие',s18:'Только 18″',s12:'Только 12″',s10:'Только 10″',s5:'Только 5″'};

/* holidays: default inscription, recommended palette, kit of symbols and props */
D.HOLIDAYS = [
  {id:'hanukkah', name:'Ханука',                 pal:'emerald', text:'HAPPY\nHANUKKAH',
   kit:[['sym','magen',220,'wall',-.3,.52],['sym','magen',180,'wall',.3,.58],['sym','magen',520,'floor',-.86],['sym','magen',520,'floor',.86],['sym','hanukkiah',750,'floor',0],['prop','dreidel',330,-1.32],['prop','dreidel',280,1.3],['prop','candles',300,-.38],['prop','candles',300,.4],['prop','gifts',560,1.78]]},
  {id:'newyear',  name:'Новый год / Рождество',  pal:'xmas',    text:'MERRY\nCHRISTMAS',
   kit:[['sym','snow',260,'wall',-.3,.5],['sym','snow',200,'wall',.32,.6],['sym','snow',160,'wall',0,.4],['sym','tree',800,'floor',-.95],['sym','tree',620,'floor',1.02],['prop','gifts',560,-.3],['prop','gifts',560,.45],['prop','candles',300,0]]},
  {id:'birthday', name:'День рождения',          pal:'ochre',   text:'HAPPY\nBIRTHDAY',
   kit:[['sym','star',240,'wall',-.3,.5],['sym','star',180,'wall',.32,.58],['sym','star',150,'wall',.05,.4],['sym','digit',560,'floor',-.75],['prop','plinths',900,.8],['prop','gifts',560,0],['prop','candles',300,.3]]},
  {id:'wedding',  name:'Свадьба / помолвка',     pal:'pastel',  text:'JUST\nMARRIED',
   kit:[['sym','rings',420,'wall',0,.45],['prop','pampas',520,-.95],['prop','pampas',460,1.0],['prop','plinths',900,.55],['prop','candles',300,-.3],['prop','candles',300,.1]]},
  {id:'baby',     name:'Baby shower',            pal:'pastel',  text:'OH\nBABY',
   kit:[['sym','cloud',520,'wall',-.28,.5],['sym','cloud',400,'wall',.3,.6],['sym','heart',240,'wall',.02,.4],['prop','plinths',900,-.8],['prop','gifts',560,.5]]},
  {id:'halloween',name:'Хэллоуин',               pal:'pumpkin', text:'TRICK\nOR TREAT',
   kit:[['sym','moon',520,'wall',.28,.55],['sym','pumpkin',480,'floor',-.7],['sym','pumpkin',380,'floor',-.25],['sym','pumpkin',420,'floor',.7],['prop','candles',300,.25]]},
  {id:'ramadan',  name:'Рамадан / Ид',           pal:'onyx',    text:'EID\nMUBARAK',
   kit:[['sym','moon',620,'wall',0,.42],['sym','star',160,'wall',-.32,.58],['sym','star',120,'wall',.34,.62],['prop','candles',300,-.6],['prop','candles',300,.6],['prop','plinths',900,1.1]]},
  {id:'grad',     name:'Выпускной',              pal:'onyx',    text:'CLASS OF\n2027',
   kit:[['sym','star',240,'wall',-.3,.5],['sym','star',180,'wall',.3,.58],['sym','digit',520,'floor',-.8],['prop','plinths',900,.85],['prop','gifts',560,.2]]}
];
D.holiday = function(id){for(var i=0;i<D.HOLIDAYS.length;i++)if(D.HOLIDAYS[i].id===id)return D.HOLIDAYS[i];return D.HOLIDAYS[0]};

/* default unit prices, EUR. Editable in the estimate; these are starting points, not quotes. */
D.PRICE = {
  pvc:135, bar:4.8, ply:85, scr70:0.04, plate:0.6, scr30:0.03, pva:9, scr35:0.03, ms:6,
  tube:16, bend:15, weld:20, scrMetal:0.05,
  putty:9, paint:14, paintBack:11, sundries:15,
  hinge:3, hook:2.5, rubber:0.5, bag:12,
  insert:0.5, wing:1.4, angle:0.6,
  pad:0.5, strap:5,
  magnet:0.35, washer:0.08, epoxy:8, brassHook:0.8, sleeve:1.2, pin:0.6, velcro:2,
  slat:3.5, mount:6,
  b18:0.9, b12:0.18, b10:0.14, b5:0.08, tape:3, dots:7, ties:0.15, ring:0.8, greens:3.5,
  k_neon:180, k_gold:140, k_flat:60,
  k_hanukkiah:90, k_magen_wall:25, k_magen_floor:60, k_star:25, k_heart:25, k_rings:45, k_moon:60, k_snow:15, k_cloud:20, k_tree:45, k_pumpkin:18, k_digit:40,
  k_gifts:24, k_candles:12, k_dreidel:70, k_plinths:120, k_pampas:35,
  k_shell:55, k_starfish:30, k_podr:95, k_podq:85, k_plc:60, k_plq:50, k_pic:55,
  seqTile:2.4, print:38, floorMat:9, helium:2, bweight:0.4,
  b36:6.5, b24:2.8, he_foil_s:1, he_foil_l:3, fl_flower:2.5, fl_sprig:3, gwMat:9, fabric:4,
  k_stand:45, k_stand_t:15, k_marquee:70, k_easel:35, k_table:60,
  fab_satin:6, fab_velvet:12, k_bstand:45, k_tieback:6, fl_hydr:4.5, fl_gold:3.5,
  k_mframe:55, k_mglass:75, k_mcyl:65, k_mset:160, k_easel_gold:45, k_easel_black:40, k_easel_table:15,
  k_lid_panel:15, k_lid_mirror:22, k_lid_marble:28, k_lid_wood:18,
  k_gift:8, k_gift_l:12, k_candelabra:35, k_csticks:30, k_lantern:18, k_nsign:60,
  foilWall:3.5, sprayGlue:9, neon_m6:7.5, neon_m8:9.5, neon_psu:18, neon_clip:0.15, neon_acr:55
};
/* balloons inside garlands and clusters by finish; foil balloons by shape and size */
(function(){['b36','b24','b18','b12','b10','b5'].forEach(function(k){var b=D.PRICE[k];D.PRICE[k+'_chrome']=Math.round(b*2.2*100)/100;D.PRICE[k+'_pearl']=Math.round(b*1.4*100)/100;D.PRICE[k+'_confetti']=Math.round(b*2.5*100)/100});
  var fp={16:1.5,18:1.2,32:3.5,40:5.5};Object.keys(D.FOIL_SIZES).forEach(function(k){D.FOIL_SIZES[k].forEach(function(z){D.PRICE['fb_'+k+'_'+z]=fp[z]})})})();
/* single balloons: price by finish and size */
(function(){var base={5:.08,10:.14,12:.18,18:.9,24:2.8,36:6.5},clear={5:.5,10:.7,12:.9,18:1.6,24:2.4,36:4.5};
  Object.keys(D.BSIZE).forEach(function(sz){D.PRICE['sb_latex_'+sz]=base[sz];D.PRICE['sb_chrome_'+sz]=Math.round(base[sz]*2.2*100)/100;D.PRICE['sb_clear_'+sz]=clear[sz]})})();

D.TEMPLATES = [
  {id:'three', name:'Три арки',          note:'Портал с нишей, главная и задняя арки, малая арка, гирлянда'},
  {id:'circle',name:'Круг и арки',       note:'Круглый фон, две арки разной высоты, кластер'},
  {id:'panel', name:'Панель и открытые арки', note:'Прямоугольный фон и две открытые арки'},
  {id:'solo',  name:'Одна арка',         note:'Минимальный набор: арка, гирлянда, надпись'},
  {id:'shine', name:'Пайетки и полуарка', note:'Пайеточная панель, полуарка, ракушки, подиум, прозрачные шары'},
  {id:'empty', name:'Пустая сцена',      note:'Собрать с нуля'}
];

/* reference texts carried over from the original app */
D.MOUNTS = [
  ['Магнит под краской','до 2,5 кг','сетка 200×200 на больших фонах','стальные шайбы 16 мм на тыле','1 мин','Звёзды, таблички, печатные панели, цифры'],
  ['Штифт во втулке','1–5 кг','4 гнезда на главном фоне, 2 на втором','2 штифта Ø8×40 + 2 шайбы','1–2 мин','Тяжёлые панели, зеркальный акрил, деревянные буквы'],
  ['Крюки','до 6 кг','2 в верхней зоне под надпись','цепочки или кольца на накладке','2 мин','Неон, венок, кашпо'],
  ['Кольца на торцах','гирлянда','торцы фонов по трассе гирлянды, шаг 300 мм','хомуты на перфоленту','15–30 мин','Гирлянда из шаров, зелень, ткань'],
  ['Барашки ниши','до 8 кг','стойки ниши портала','вставка с 4 футорками M6','3 мин','Рейки, зеркало, цветочная стена'],
  ['Липучка по торцу','ткань','тыльный торец дуги','ответная лента на ткани','5–10 мин','Шифон, вуаль, чехлы']
];
D.BG_WAYS = [
  ['Перекраска','Акрил или латекс матовый, 2 слоя по адгезионному грунту','3–4 ч + сушка 12 ч','≈ 25–40 € / модуль','Любой оттенок, ровная матовая поверхность'],
  ['Чехол из спандекса','Бифлекс 4-way stretch, пошив по лекалу, резинка или молния снизу','5–7 мин / модуль','≈ 60–120 € / чехол','Самая быстрая смена цвета, лёгкое хранение'],
  ['Виниловая плёнка','Oracal 641 / 8500 матовая; фактуры: мрамор, бетон, дерево','40–60 мин / модуль','≈ 15–25 € / м²','Фактуры и рисунки, моется'],
  ['Печатные панели-накладки','УФ-печать на ПВХ 3 мм, стальные шайбы на тыле','5–10 мин','≈ 35–50 € / м²','Фотофактуры, логотипы, имена; ставятся на магнитную сетку'],
  ['Сменная вставка ниши','Рейки, зеркальный акрил, пайетки на ПВХ 5 мм','3 мин','≈ 40–120 € / вставка','Меняет характер портала без перекраски'],
  ['Драпировка','Шифон или вуаль поверх заднего фона на липучке по верхней дуге','10–15 мин','≈ 20–40 €','Мягкость для свадеб и baby shower']
];
D.TOOLS = ['Шуруповёрт, биты PZ2, сверло-зенкер','Торцовочная пила или лобзик','Фрезер с копиром или раскрой ПВХ на ЧПУ','Сверло Форстнера 15 мм (гнёзда магнитов)','Шлифмашинка, шпатели 10 и 25 см','Уровень 1 м, рулетка 5 м, угольник','Насос для шаров и шаблон-калибратор','Для металла: сварочный полуавтомат, болгарка, струбцины'];
D.FRAME_RULES = [
  'Шаг стоек и ригелей не больше 600 мм, иначе ПВХ 10 мм «играет» и даёт волну на свету.',
  'Стойки выставляются по осям соседних фонов, чтобы проставки попадали в брус, а не в обшивку.',
  'Дуга деревянного каркаса: два слоя фанеры 18 мм, стыки слоёв смещены на полсегмента.',
  'Металл: труба 40×20×1,5; в плоскости обшивки 20 мм, в глубину 40 мм. Дуги гнутся на трубогибе одной деталью.',
  'Упоры складываются на петлях вдоль панели, модуль перевозится плоским.',
  'Обшивка крепится саморезами с шагом до 180 мм, головки утапливаются и шпаклюются.'
];
D.SAFETY = [
  'Проставки обязательны: связанные фоны образуют жёсткую ступенчатую систему, которая устойчивее отдельных панелей.',
  'На улице и при сквозняке нужно дополнительное крепление к полу или стене.',
  'В общественных местах только LED-свечи. Живой огонь рядом с латексом и сухоцветами запрещён.',
  'Неон 12 В: блок питания за конструкцией, кабель приклеить к полу защитным каналом.',
  'Латекс: предупредить заказчика об аллергии; альтернатива — фольгированные шары.',
  'Края ПВХ и головки саморезов зашпаклёваны, острых кромок нет.',
  'Для залов больше чем на 200 посетителей в NRW украшения должны быть минимум schwerentflammbar (B1). Сертификат на ПВХ и ткань запросить у поставщика, правила по шарам — у площадки.'
];
D.STORAGE = [
  'Модули хранить вертикально, на ребре, в чехлах из спанбонда. Не класть друг на друга без прокладок.',
  'ПВХ не любит перегрева: не хранить у батарей и под солнцем в машине (коробление выше 60 °C).',
  'Подкраску сколов делать сразу: у каждого модуля свой подписанный остаток краски.'
];
