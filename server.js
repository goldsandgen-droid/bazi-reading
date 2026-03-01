const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { Solar } = require('lunar-javascript');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Ba Zi Constants ─────────────────────────────────────────────
const STEMS_MAP = {
  '\u7532': { name: 'Jia', cn: '\u7532', element: 'Wood', polarity: '+' },
  '\u4e59': { name: 'Yi', cn: '\u4e59', element: 'Wood', polarity: '-' },
  '\u4e19': { name: 'Bing', cn: '\u4e19', element: 'Fire', polarity: '+' },
  '\u4e01': { name: 'Ding', cn: '\u4e01', element: 'Fire', polarity: '-' },
  '\u620a': { name: 'Wu', cn: '\u620a', element: 'Earth', polarity: '+' },
  '\u5df1': { name: 'Ji', cn: '\u5df1', element: 'Earth', polarity: '-' },
  '\u5e9a': { name: 'Geng', cn: '\u5e9a', element: 'Metal', polarity: '+' },
  '\u8f9b': { name: 'Xin', cn: '\u8f9b', element: 'Metal', polarity: '-' },
  '\u58ec': { name: 'Ren', cn: '\u58ec', element: 'Water', polarity: '+' },
  '\u7678': { name: 'Gui', cn: '\u7678', element: 'Water', polarity: '-' },
};

const BRANCHES_MAP = {
  '\u5b50': { name: 'Zi', cn: '\u5b50', element: 'Water', polarity: '+', animal: 'Rat' },
  '\u4e11': { name: 'Chou', cn: '\u4e11', element: 'Earth', polarity: '-', animal: 'Ox' },
  '\u5bc5': { name: 'Yin', cn: '\u5bc5', element: 'Wood', polarity: '+', animal: 'Tiger' },
  '\u536f': { name: 'Mao', cn: '\u536f', element: 'Wood', polarity: '-', animal: 'Rabbit' },
  '\u8fb0': { name: 'Chen', cn: '\u8fb0', element: 'Earth', polarity: '+', animal: 'Dragon' },
  '\u5df3': { name: 'Si', cn: '\u5df3', element: 'Fire', polarity: '-', animal: 'Snake' },
  '\u5348': { name: 'Wu', cn: '\u5348', element: 'Fire', polarity: '+', animal: 'Horse' },
  '\u672a': { name: 'Wei', cn: '\u672a', element: 'Earth', polarity: '-', animal: 'Goat' },
  '\u7533': { name: 'Shen', cn: '\u7533', element: 'Metal', polarity: '+', animal: 'Monkey' },
  '\u9149': { name: 'You', cn: '\u9149', element: 'Metal', polarity: '-', animal: 'Rooster' },
  '\u620c': { name: 'Xu', cn: '\u620c', element: 'Earth', polarity: '+', animal: 'Dog' },
  '\u4ea5': { name: 'Hai', cn: '\u4ea5', element: 'Water', polarity: '-', animal: 'Pig' },
};

const ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const BRANCH_TO_MAIN_QI = {
  '\u5b50': '\u7678', '\u4e11': '\u5df1', '\u5bc5': '\u7532', '\u536f': '\u4e59',
  '\u8fb0': '\u620a', '\u5df3': '\u4e19', '\u5348': '\u4e01', '\u672a': '\u5df1',
  '\u7533': '\u5e9a', '\u9149': '\u8f9b', '\u620c': '\u620a', '\u4ea5': '\u58ec',
};

// ─── Calculation Functions ───────────────────────────────────────
function getElementRelation(me, other) {
  if (me === other) return 'Same';
  const meIdx = ELEMENTS.indexOf(me);
  const otherIdx = ELEMENTS.indexOf(other);
  if (meIdx === -1 || otherIdx === -1) return 'Unknown';
  if ((meIdx + 1) % 5 === otherIdx) return 'Generates';
  if ((otherIdx + 1) % 5 === meIdx) return 'GeneratedBy';
  if ((meIdx + 2) % 5 === otherIdx) return 'Controls';
  if ((otherIdx + 2) % 5 === meIdx) return 'ControlledBy';
  return 'Unknown';
}

function calculateTenGod(dayMasterChar, targetChar) {
  const dm = STEMS_MAP[dayMasterChar];
  const target = STEMS_MAP[targetChar];
  if (!dm || !target) return 'Unknown';
  const relation = getElementRelation(dm.element, target.element);
  const samePolarity = dm.polarity === target.polarity;
  switch (relation) {
    case 'Same': return samePolarity ? 'Friend (Bi Jian)' : 'Rob Wealth (Jie Cai)';
    case 'Generates': return samePolarity ? 'Eating God (Shi Shen)' : 'Hurting Officer (Shang Guan)';
    case 'GeneratedBy': return samePolarity ? 'Indirect Resource (Pian Yin)' : 'Direct Resource (Zheng Yin)';
    case 'Controls': return samePolarity ? 'Indirect Wealth (Pian Cai)' : 'Direct Wealth (Zheng Cai)';
    case 'ControlledBy': return samePolarity ? 'Seven Killings (Qi Sha)' : 'Direct Officer (Zheng Guan)';
    default: return 'Unknown';
  }
}

function buildPillar(ganChar, zhiChar) {
  const gan = STEMS_MAP[ganChar] || { name: ganChar, cn: ganChar, element: 'Unknown', polarity: '?' };
  const zhi = BRANCHES_MAP[zhiChar] || { name: zhiChar, cn: zhiChar, element: 'Unknown', polarity: '?', animal: '?' };
  return {
    stem: gan.name, branch: zhi.name,
    stemCn: gan.cn, branchCn: zhi.cn,
    elementStem: gan.element, elementBranch: zhi.element,
    polarityStem: gan.polarity, polarityBranch: zhi.polarity,
    animal: zhi.animal,
    charStem: ganChar, charBranch: zhiChar,
  };
}

function performCalculation({ birthYear, birthMonth, birthDay, birthHour, birthMinute, gender }) {
  const solar = Solar.fromYmdHms(birthYear, birthMonth, birthDay, birthHour || 0, birthMinute || 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearPillar = buildPillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = buildPillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = buildPillar(eightChar.getDayGan(), eightChar.getDayZhi());
  const hourPillar = buildPillar(eightChar.getTimeGan(), eightChar.getTimeZhi());
  const pillars = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };

  // Five Elements count
  const counts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  [yearPillar, monthPillar, dayPillar, hourPillar].forEach(p => {
    if (counts[p.elementStem] !== undefined) counts[p.elementStem]++;
    if (counts[p.elementBranch] !== undefined) counts[p.elementBranch]++;
  });
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const fiveElementsPercent = {};
  ELEMENTS.forEach(el => { fiveElementsPercent[el] = total ? Math.round((counts[el] / total) * 100) : 0; });

  // Ten Gods
  const dayMasterChar = eightChar.getDayGan();
  const tenGodsCounts = {};
  const ALL_TEN_GODS = [
    'Friend (Bi Jian)', 'Rob Wealth (Jie Cai)',
    'Eating God (Shi Shen)', 'Hurting Officer (Shang Guan)',
    'Indirect Wealth (Pian Cai)', 'Direct Wealth (Zheng Cai)',
    'Seven Killings (Qi Sha)', 'Direct Officer (Zheng Guan)',
    'Indirect Resource (Pian Yin)', 'Direct Resource (Zheng Yin)',
  ];
  ALL_TEN_GODS.forEach(t => tenGodsCounts[t] = 0);

  const getStemEquiv = (char) => STEMS_MAP[char] ? char : BRANCH_TO_MAIN_QI[char];

  [yearPillar.charStem, yearPillar.charBranch,
   monthPillar.charStem, monthPillar.charBranch,
   dayPillar.charBranch,
   hourPillar.charStem, hourPillar.charBranch,
  ].forEach(char => {
    const stemVal = getStemEquiv(char);
    if (stemVal) {
      const tg = calculateTenGod(dayMasterChar, stemVal);
      if (tenGodsCounts[tg] !== undefined) tenGodsCounts[tg] += 10;
    }
  });

  const tenGods = Object.entries(tenGodsCounts).map(([name, val]) => ({ name, strength: val }));

  // Luck Cycles (Da Yun)
  const genderInt = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderInt);
  const daYunArr = yun.getDaYun();
  const luckCycles = daYunArr.slice(1, 9).map(dy => {
    const ganZhi = dy.getGanZhi();
    const gan = ganZhi.substring(0, 1);
    const zhi = ganZhi.substring(1, 2);
    return {
      range: `${dy.getStartAge()}-${dy.getEndAge()}`,
      stem: STEMS_MAP[gan]?.name || gan,
      branch: BRANCHES_MAP[zhi]?.name || zhi,
      stemCn: gan,
      branchCn: zhi,
      elementStem: STEMS_MAP[gan]?.element || 'Unknown',
      elementBranch: BRANCHES_MAP[zhi]?.element || 'Unknown',
      startYear: typeof dy.getStartYear === 'function' ? dy.getStartYear() : null,
      endYear: typeof dy.getEndYear === 'function' ? dy.getEndYear() : null,
    };
  });

  // Day Master strength analysis
  const dmElement = STEMS_MAP[dayMasterChar]?.element;
  let supportCount = 0;
  let drainCount = 0;
  Object.entries(counts).forEach(([el, count]) => {
    const rel = getElementRelation(dmElement, el);
    if (rel === 'Same' || rel === 'GeneratedBy') supportCount += count;
    else drainCount += count;
  });
  const strength = supportCount > drainCount ? 'Strong' : supportCount < drainCount ? 'Weak' : 'Balanced';

  return {
    pillars, fiveElements: counts, fiveElementsPercent, tenGods, luckCycles,
    dayMaster: { char: dayMasterChar, name: STEMS_MAP[dayMasterChar]?.name, element: dmElement, strength },
  };
}

// ─── API Routes ──────────────────────────────────────────────────
app.post('/api/calculate', (req, res) => {
  try {
    const { birthYear, birthMonth, birthDay, birthHour, birthMinute, gender } = req.body;
    if (!birthYear || !birthMonth || !birthDay || gender === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = performCalculation({
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
      birthHour: Number(birthHour) || 0,
      birthMinute: Number(birthMinute) || 0,
      gender,
    });
    res.json(result);
  } catch (err) {
    console.error('Calculation error:', err);
    res.status(500).json({ error: 'Calculation failed: ' + err.message });
  }
});

app.post('/api/interpret', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured in .env' });
  }

  // Access code check
  const ACCESS_CODE = process.env.ACCESS_CODE || 'destiny';
  if (req.body.accessCode !== ACCESS_CODE) {
    return res.status(403).json({ error: 'Invalid access code' });
  }

  const { pillars, fiveElements, fiveElementsPercent, tenGods, luckCycles, dayMaster, mode, language } = req.body;
  if (!pillars) return res.status(400).json({ error: 'Chart data required' });

  // Language config
  const lang = language === 'zh' ? 'zh' : 'en';
  const outputLangInstruction = lang === 'zh'
    ? '\u91cd\u8981\uff1a\u8bf7\u7528\u7b80\u4f53\u4e2d\u6587\u8f93\u51fa\u6240\u6709\u5185\u5bb9\u3002\u4f7f\u7528\u6e05\u6670\u7684Markdown\u6807\u9898\u7ed3\u6784\u3002'
    : '\u91cd\u8981\uff1a\u8bf7\u7528\u82f1\u6587\u8f93\u51fa\u6240\u6709\u5185\u5bb9\uff0c\u4f46\u81ea\u7136\u5730\u7a7f\u63d2\u4e2d\u6587\u547d\u7406\u672f\u8bed\u3002\u4e2d\u6587\u672f\u8bed\u540e\u62ec\u53f7\u5185\u9644\u82f1\u6587\u7ffb\u8bd1\uff0c\u4f8b\u5982\uff1a\u6b63\u8d22 (Direct Wealth)\u3002';

  // Build prompt data
  const elementLines = fiveElementsPercent
    ? Object.entries(fiveElementsPercent).map(([k, v]) => `- ${k}: ${v}%`).join('\n')
    : '- Not provided';

  const tenGodLines = Array.isArray(tenGods)
    ? tenGods.filter(tg => tg?.strength > 0).sort((a, b) => b.strength - a.strength)
        .slice(0, 5).map(tg => `- ${tg.name}: ${tg.strength}`).join('\n')
    : '- Not provided';

  const luckLines = Array.isArray(luckCycles)
    ? luckCycles.map(c => `- Age ${c.range}: ${c.stem} ${c.branch} (${c.elementStem}/${c.elementBranch})`).join('\n')
    : '- Not provided';

  const genderLabel = req.body.gender === 'male' ? '\u4e7e\u9020 (Male Chart)' : '\u5764\u9020 (Female Chart)';
  const genderCn = req.body.gender === 'male' ? '\u7537' : '\u5973';
  const genderEn = req.body.gender === 'male' ? 'Male' : 'Female';

  let systemPrompt = `\u4f60\u662f\u4e00\u4f4d\u7ecf\u9a8c\u4e30\u5bcc\u7684\u516b\u5b57\u547d\u7406\u5927\u5e08\uff0c\u7cbe\u901a\u4e2d\u56fd\u4f20\u7edf\u547d\u7406\u5b66\u3002\u4f60\u4f7f\u7528\u7ecf\u5178\u7684\u5e72\u652f\u7cfb\u7edf\u89e3\u8bfb\u516b\u5b57\u547d\u76d8\u3002

\u6b64\u547d\u76d8\u4e3a${genderLabel}\uff08${genderCn}\u547d\uff09\uff0c\u51fa\u751f\u4e8e ${req.body.birthYear}\u5e74${req.body.birthMonth}\u6708${req.body.birthDay}\u65e5 ${String(req.body.birthHour || 0).padStart(2,'0')}:${String(req.body.birthMinute || 0).padStart(2,'0')}\u3002\u4f60\u5fc5\u987b\u5728\u6574\u4e2a\u89e3\u8bfb\u4e2d\u8003\u8651\u547d\u4e3b\u7684\u6027\u522b\u3002

\u6027\u522b\u5dee\u5f02\u89c4\u5219\uff08\u5fc5\u987b\u9075\u5b88\uff09\uff1a
- \u4e7e\u9020\uff08\u7537\uff09\uff1a\u6b63\u8d22\u4e3a\u59bb\u661f\uff0c\u65e5\u652f\u4e3a\u592b\u59bb\u5bab\u3002\u504f\u8d22\u4e5f\u53ef\u4ee3\u8868\u7236\u4eb2\u6216\u60c5\u4eba\u3002\u4e03\u6740\u4ee3\u8868\u7ade\u4e89\u5bf9\u624b\u548c\u6311\u6218\u3002
- \u5764\u9020\uff08\u5973\uff09\uff1a\u6b63\u5b98\u4e3a\u592b\u661f\uff0c\u65e5\u652f\u4e3a\u592b\u59bb\u5bab\u3002\u4e03\u6740\u53ef\u4ee3\u8868\u60c5\u4eba\u6216\u975e\u6b63\u5f0f\u4f34\u4fa3\u3002\u4f24\u5b98\u514b\u5b98\uff0c\u5a5a\u59fb\u4e2d\u9700\u6ce8\u610f\u3002
- \u7537\u547d\u770b\u6b63\u8d22/\u504f\u8d22\u8bba\u59bb\u59be\u548c\u8d22\u8fd0\uff0c\u5973\u547d\u770b\u6b63\u5b98/\u4e03\u6740\u8bba\u4e08\u592b\u548c\u4e8b\u4e1a\u8d35\u4eba
- \u5927\u8fd0\u8d70\u52bf\u5bf9\u7537\u5973\u7684\u5f71\u54cd\u4e0d\u540c\uff1a\u7537\u547d\u987a\u6392\u6216\u9006\u6392\u53d6\u51b3\u4e8e\u5e74\u5e72\u9634\u9633\u548c\u6027\u522b\uff0c\u89e3\u8bfb\u65f6\u5fc5\u987b\u6307\u660e\u8fd9\u4e00\u70b9
- \u6027\u683c\u5206\u6790\u5fc5\u987b\u7ed3\u5408\u6027\u522b\uff0c\u76f8\u540c\u7684\u65e5\u4e3b\u4e94\u884c\u5728\u7537\u5973\u8eab\u4e0a\u8868\u73b0\u4e0d\u540c

\u6838\u5fc3\u65b9\u6cd5\u8bba\uff1a
- \u516b\u5b57\u6392\u76d8\uff1a\u56db\u67f1\uff08\u5e74\u67f1\u3001\u6708\u67f1\u3001\u65e5\u67f1\u3001\u65f6\u67f1\uff09\uff0c\u6bcf\u67f1\u5305\u542b\u5929\u5e72\u548c\u5730\u652f
- \u65e5\u5143/\u65e5\u4e3b\uff1a\u65e5\u67f1\u5929\u5e72\u4ee3\u8868\u547d\u4e3b\u672c\u4eba\uff0c\u5176\u4e94\u884c\u5c5e\u6027\u548c\u65fa\u8870\u662f\u6574\u4e2a\u547d\u76d8\u89e3\u8bfb\u7684\u57fa\u7840
- \u4e94\u884c\uff1a\u6728\u3001\u706b\u3001\u571f\u3001\u91d1\u3001\u6c34\u3002\u5206\u6790\u5176\u5e73\u8861\uff0c\u4f55\u8005\u65fa\u3001\u4f55\u8005\u7f3a\uff0c\u4ee5\u53ca\u751f\u514b\u5173\u7cfb\uff08\u76f8\u751f\u76f8\u514b\u5faa\u73af\uff09
- \u5341\u795e\uff1a\u7531\u5404\u5b57\u4e0e\u65e5\u4e3b\u7684\u5173\u7cfb\u63a8\u5bfc\u3002\u5305\u62ec\u6b63\u5b98\u3001\u504f\u5b98/\u4e03\u6740\u3001\u6b63\u8d22\u3001\u504f\u8d22\u3001\u98df\u795e\u3001\u4f24\u5b98\u3001\u6b63\u5370\u3001\u504f\u5370\u3001\u6bd4\u80a9\u3001\u52ab\u8d22
- \u5927\u8fd0\uff1a\u6bcf\u6b65\u5927\u8fd0\u7ea6\u7ba110\u5e74\u3002\u5206\u6790\u6bcf\u6b65\u5927\u8fd0\u7684\u4e94\u884c\u5982\u4f55\u4e0e\u65e5\u4e3b\u53ca\u6574\u4f53\u547d\u76d8\u4ea4\u4e92
- \u7528\u795e\uff1a\u786e\u5b9a\u547d\u76d8\u6700\u9700\u8981\u54ea\u79cd\u4e94\u884c\u6765\u5e73\u8861
- \u5fcc\u795e\uff1a\u786e\u5b9a\u547d\u76d8\u6700\u5fcc\u8beb\u7684\u4e94\u884c\uff0c\u9700\u8981\u56de\u907f

\u89e3\u8bfb\u5fc5\u987b\u8986\u76d6\uff1a
1. \u65e5\u5143\u5206\u6790 - \u4e94\u884c\u5c5e\u6027\u3001\u9634\u9633\u3001\u8eab\u5f3a/\u8eab\u5f31/\u4e2d\u548c\u3001\u6027\u683c\u7279\u5f81\u548c\u5929\u7136\u503e\u5411\uff08\u7ed3\u5408\u6027\u522b\u5206\u6790\uff09
2. \u4e94\u884c\u5206\u5e03 - \u4f55\u8005\u65fa\u3001\u4f55\u8005\u7f3a\u3001\u751f\u514b\u5173\u7cfb\u5bf9\u547d\u4e3b\u7684\u5f71\u54cd
3. \u5341\u795e\u683c\u5c40 - \u54ea\u4e9b\u5341\u795e\u5360\u4e3b\u5bfc\u5730\u4f4d\uff0c\u5bf9\u6027\u683c\u3001\u611f\u60c5\u3001\u4e8b\u4e1a\u3001\u8d22\u8fd0\u7684\u5f71\u54cd\uff08\u5fc5\u987b\u533a\u5206\u7537\u5973\u4e0d\u540c\u542b\u4e49\uff09
4. \u5927\u8fd0\u8d70\u52bf - \u9010\u6b65\u5206\u6790\u5404\u5927\u8fd0\uff0c\u6807\u6ce8\u5409\u8fd0\u548c\u51f6\u8fd0\u7684\u5177\u4f53\u5e74\u9f84\u6bb5
5. \u7528\u795e\u4e0e\u5b9e\u8df5\u5efa\u8bae - \u5e94\u8be5\u8ffd\u6c42\u54ea\u79cd\u4e94\u884c\uff0c\u6709\u5229\u7684\u65b9\u4f4d\u3001\u989c\u8272\u3001\u884c\u4e1a\uff0c\u4ee5\u53ca\u53ef\u64cd\u4f5c\u7684\u751f\u6d3b\u5efa\u8bae

\u89c4\u5219\uff1a
- \u5fc5\u987b\u9488\u5bf9\u6b64\u547d\u76d8\u5177\u4f53\u5206\u6790\uff0c\u5f15\u7528\u5b9e\u9645\u7684\u67f1\u3001\u4e94\u884c\u3001\u5341\u795e
- \u4e0d\u8981\u7b3c\u7edf\u7684\u5957\u8bdd\u6216\u6cdb\u6cdb\u800c\u8c08
- \u4f7f\u7528\u6e05\u6670\u7684Markdown\u6807\u9898\u7ed3\u6784

${outputLangInstruction}
\u5728\u5206\u6790\u4e2d\u5fc5\u987b\u660e\u786e\u63d0\u53ca\u547d\u4e3b\u662f${genderEn}\uff08${genderCn}\u547d\uff09\uff0c\u5e76\u6839\u636e\u6027\u522b\u8c03\u6574\u6240\u6709\u5341\u795e\u542b\u4e49\u7684\u89e3\u8bfb\u3002`;

  if (mode === 'love') {
    systemPrompt += `\n\n\u4e13\u9898\u6df1\u5ea6\u89e3\u8bfb\uff1a\u611f\u60c5\u5a5a\u59fb\uff08\u9488\u5bf9${genderCn}\u547d\uff09

\u6b64\u4e3a${genderLabel}\u3002${req.body.gender === 'male' ? '\u7537\u547d\u770b\u6b63\u8d22\u4e3a\u59bb\u661f\uff0c\u504f\u8d22\u4e3a\u60c5\u4eba\u661f\uff0c\u65e5\u652f\u4e3a\u592b\u59bb\u5bab\u3002\u5206\u6790\u6b63\u8d22\u7684\u5f3a\u5f31\u548c\u4f4d\u7f6e\u6765\u5224\u65ad\u5a5a\u59fb\u8d28\u91cf\u3002' : '\u5973\u547d\u770b\u6b63\u5b98\u4e3a\u592b\u661f\uff0c\u4e03\u6740\u4e3a\u60c5\u4eba\u661f\uff0c\u65e5\u652f\u4e3a\u592b\u59bb\u5bab\u3002\u5206\u6790\u6b63\u5b98\u7684\u5f3a\u5f31\u548c\u4f4d\u7f6e\u6765\u5224\u65ad\u5a5a\u59fb\u8d28\u91cf\u3002\u4f24\u5b98\u89c1\u5b98\u9700\u7279\u522b\u6ce8\u610f\u3002'}

\u4f60\u5fc5\u987b\u9010\u4e00\u56de\u7b54\u4ee5\u4e0b\u95ee\u9898\uff08\u7528\u6e05\u6670\u7684\u5c0f\u6807\u9898\u5206\u9694\u6bcf\u4e2a\u95ee\u9898\uff09\uff1a

1. \u7406\u60f3\u4f34\u4fa3\u753b\u50cf\uff1a\u6839\u636e\u547d\u76d8\u4e2d\u7684${req.body.gender === 'male' ? '\u59bb\u661f\uff08\u6b63\u8d22/\u504f\u8d22\uff09' : '\u592b\u661f\uff08\u6b63\u5b98/\u4e03\u6740\uff09'}\u4e94\u884c\u5c5e\u6027\uff0c\u63cf\u8ff0\u6700\u9002\u5408\u7684\u4f34\u4fa3\u7c7b\u578b\u3002\u5305\u62ec\uff1a\u5bf9\u65b9\u7684\u6027\u683c\u7279\u5f81\u3001\u4e94\u884c\u5c5e\u6027\u3001\u9002\u5408\u7684\u751f\u8096\u6216\u65e5\u4e3b\u7c7b\u578b\u3001\u5916\u8c8c\u6c14\u8d28\u503e\u5411\u3002
2. \u604b\u7231\u548c\u5a5a\u59fb\u65f6\u673a\uff1a\u9010\u6b65\u68c0\u67e5\u6bcf\u6b65\u5927\u8fd0\uff0c\u660e\u786e\u6307\u51fa\u54ea\u4e9b\u5e74\u9f84\u6bb5\u662f\u611f\u60c5\u6700\u65fa\u7684\u65f6\u671f\uff08\u6843\u82b1\u8fd0\u65fa\u3001\u5a5a\u59fb\u5bab\u88ab\u51b2\u5408\u7684\u5e74\u4efd\uff09\u3002\u7ed9\u51fa\u5177\u4f53\u7684\u5e74\u9f84\u8303\u56f4\uff0c\u4f8b\u5982\u201c26-28\u5c81\u662f\u6700\u5f3a\u7684\u5a5a\u59fb\u7a97\u53e3\u201d\u3002
3. \u611f\u60c5\u4e2d\u7684\u6f5c\u5728\u969c\u788d\uff1a\u5206\u6790\u547d\u76d8\u4e2d\u53ef\u80fd\u5bfc\u81f4\u611f\u60c5\u56f0\u96be\u7684\u56e0\u7d20\u3002${req.body.gender === 'male' ? '\u4f8b\u5982\uff1a\u52ab\u8d22\u593a\u59bb\u3001\u6bd4\u80a9\u4e89\u8d22\u3001\u65e5\u652f\u88ab\u51b2\u7b49\u3002' : '\u4f8b\u5982\uff1a\u4f24\u5b98\u89c1\u5b98\u3001\u4e03\u6740\u6df7\u6742\u3001\u65e5\u652f\u88ab\u51b2\u7b49\u3002'}\u6307\u51fa\u54ea\u4e9b\u5927\u8fd0\u5e74\u4efd\u5bb9\u6613\u51fa\u73b0\u611f\u60c5\u5371\u673a\u6216\u7b2c\u4e09\u8005\u95ee\u9898\u3002
4. \u5a5a\u59fb\u7a33\u5b9a\u6027\uff1a\u5206\u6790\u65e5\u652f\uff08\u592b\u59bb\u5bab\uff09\u7684\u72b6\u6001\u3002\u662f\u5426\u88ab\u51b2\u3001\u88ab\u5408\u3001\u88ab\u5211\uff1f\u8fd9\u5bf9\u5a5a\u59fb\u7684\u957f\u671f\u7a33\u5b9a\u6027\u610f\u5473\u7740\u4ec0\u4e48\uff1f
5. \u611f\u60c5\u6001\u5ea6\u4e0e\u76f8\u5904\u6a21\u5f0f\uff1a\u6839\u636e\u5341\u795e\u683c\u5c40\u5206\u6790\u547d\u4e3b\u5728\u611f\u60c5\u4e2d\u7684\u884c\u4e3a\u6a21\u5f0f\u3002\u662f\u4e3b\u52a8\u8ffd\u6c42\u578b\u8fd8\u662f\u88ab\u52a8\u7b49\u5f85\u578b\uff1f\u5bb9\u6613\u4ed8\u51fa\u8fd8\u662f\u5bb9\u6613\u7d22\u53d6\uff1f\u611f\u60c5\u4e2d\u6700\u5927\u7684\u4f18\u52bf\u548c\u6700\u5927\u7684\u5f31\u70b9\u662f\u4ec0\u4e48\uff1f
6. \u5b9e\u7528\u5efa\u8bae\uff1a\u57fa\u4e8e\u7528\u795e\u4e94\u884c\uff0c\u5efa\u8bae\u6709\u5229\u4e8e\u611f\u60c5\u7684\u65b9\u4f4d\u3001\u989c\u8272\u3001\u6d3b\u52a8\u3001\u793e\u4ea4\u573a\u5408\u3002\u4ec0\u4e48\u65f6\u5019\u5e94\u8be5\u4e3b\u52a8\u51fa\u51fb\uff0c\u4ec0\u4e48\u65f6\u5019\u5e94\u8be5\u9759\u5f85\u7f18\u5206\uff1f`;
  } else if (mode === 'career') {
    systemPrompt += `\n\n\u4e13\u9898\u6df1\u5ea6\u89e3\u8bfb\uff1a\u4e8b\u4e1a\u5b98\u8fd0\uff08\u9488\u5bf9${genderCn}\u547d\uff09

\u6b64\u4e3a${genderLabel}\u3002${req.body.gender === 'male' ? '\u7537\u547d\u770b\u6b63\u5b98/\u4e03\u6740\u4e3a\u4e8b\u4e1a\u6743\u529b\u661f\u3002\u6b63\u5b98\u4ee3\u8868\u7a33\u5b9a\u4ed5\u9014\uff0c\u4e03\u6740\u4ee3\u8868\u7ade\u4e89\u62fc\u640f\u3002' : '\u5973\u547d\u770b\u6b63\u5b98\u4e5f\u4ee3\u8868\u4e08\u592b\u548c\u8d35\u4eba\uff0c\u4e03\u6740\u4ee3\u8868\u5916\u90e8\u538b\u529b\u548c\u673a\u9047\u3002\u98df\u795e/\u4f24\u5b98\u4ee3\u8868\u624d\u534e\u548c\u521b\u9020\u529b\u3002'}

\u4f60\u5fc5\u987b\u9010\u4e00\u56de\u7b54\u4ee5\u4e0b\u95ee\u9898\uff08\u7528\u6e05\u6670\u7684\u5c0f\u6807\u9898\u5206\u9694\u6bcf\u4e2a\u95ee\u9898\uff09\uff1a

1. \u5929\u8d4b\u4e0e\u804c\u4e1a\u65b9\u5411\uff1a\u6839\u636e\u65e5\u4e3b\u4e94\u884c\u3001\u5341\u795e\u683c\u5c40\u548c\u7528\u795e\uff0c\u5206\u6790\u547d\u4e3b\u5929\u751f\u9002\u5408\u4ec0\u4e48\u7c7b\u578b\u7684\u5de5\u4f5c\u3002\u662f\u9002\u5408\u7a33\u5b9a\u7684\u804c\u573a\uff08\u6b63\u5b98\u683c\uff09\u3001\u521b\u4e1a\u62fc\u640f\uff08\u4e03\u6740\u683c\uff09\u3001\u81ea\u7531\u521b\u4f5c\uff08\u98df\u4f24\u683c\uff09\u3001\u8fd8\u662f\u7ecf\u5546\u7406\u8d22\uff08\u8d22\u661f\u683c\uff09\uff1f\u7ed9\u51fa\u5177\u4f53\u7684\u884c\u4e1a\u63a8\u8350\uff0c\u4e0d\u8981\u53ea\u8bf4\u4e94\u884c\u5bf9\u5e94\u884c\u4e1a\uff0c\u8981\u7ed3\u5408\u547d\u4e3b\u7684\u6574\u4f53\u683c\u5c40\u7ed9\u51fa\u4e2a\u6027\u5316\u5efa\u8bae\u3002
2. \u6253\u5de5\u8fd8\u662f\u521b\u4e1a\uff1a\u5206\u6790\u547d\u76d8\u662f\u66f4\u9002\u5408\u4e3a\u4eba\u6253\u5de5\u8fd8\u662f\u81ea\u5df1\u5f53\u8001\u677f\u3002\u770b\u6bd4\u52ab\u7684\u529b\u91cf\uff08\u56e2\u961f\u5408\u4f5c/\u7ade\u4e89\uff09\u3001\u5b98\u6740\u7684\u529b\u91cf\uff08\u9886\u5bfc\u529b/\u538b\u529b\u627f\u53d7\uff09\u3001\u98df\u4f24\u7684\u529b\u91cf\uff08\u521b\u9020\u529b/\u8868\u8fbe\u80fd\u529b\uff09\u3002\u7ed9\u51fa\u660e\u786e\u7684\u5efa\u8bae\u3002
3. \u4e8b\u4e1a\u9ad8\u5cf0\u671f\uff1a\u9010\u6b65\u5206\u6790\u6bcf\u6b65\u5927\u8fd0\uff0c\u6307\u51fa\u54ea\u4e9b\u5e74\u9f84\u6bb5\u662f\u4e8b\u4e1a\u4e0a\u5347\u671f\u3001\u7a81\u7834\u671f\u3001\u74f6\u9888\u671f\u3002\u7ed9\u51fa\u5177\u4f53\u7684\u5e74\u9f84\u8303\u56f4\u548c\u539f\u56e0\uff0c\u4f8b\u5982\u201c32-42\u5c81\u8d70\u91d1\u6c34\u5927\u8fd0\uff0c\u7528\u795e\u5f97\u529b\uff0c\u662f\u4e8b\u4e1a\u9ec4\u91d1\u671f\u201d\u3002
4. \u4e8b\u4e1a\u98ce\u9669\u671f\uff1a\u54ea\u4e9b\u5927\u8fd0\u5e74\u4efd\u5bb9\u6613\u9047\u5230\u804c\u573a\u5371\u673a\u3001\u88c1\u5458\u3001\u5408\u4f19\u4eba\u7ea0\u7eb7\u3001\u6295\u8d44\u5931\u8d25\uff1f\u662f\u4ec0\u4e48\u4e94\u884c\u51b2\u7a81\u5bfc\u81f4\u7684\uff1f\u5982\u4f55\u63d0\u524d\u89c4\u907f\uff1f
5. \u8d35\u4eba\u4e0e\u5c0f\u4eba\uff1a\u5206\u6790\u547d\u76d8\u4e2d\u7684\u8d35\u4eba\u661f\u548c\u5c0f\u4eba\u661f\u3002\u4ec0\u4e48\u7c7b\u578b\u7684\u4eba\u4f1a\u5e2e\u52a9\u547d\u4e3b\u7684\u4e8b\u4e1a\uff1f\u4ec0\u4e48\u7c7b\u578b\u7684\u4eba\u9700\u8981\u8b66\u60d5\uff1f\u5728\u804c\u573a\u4e2d\u5e94\u8be5\u548c\u4ec0\u4e48\u4e94\u884c\u5c5e\u6027\u7684\u4eba\u5408\u4f5c\uff1f
6. \u5f53\u524d\u8fd0\u52bf\u4e0e\u8fd1\u671f\u5efa\u8bae\uff1a\u6839\u636e\u547d\u4e3b\u7684\u51fa\u751f\u5e74\u4efd\u63a8\u7b97\u5f53\u524d\u6240\u5904\u7684\u5927\u8fd0\uff0c\u5206\u6790\u73b0\u5728\u7684\u4e8b\u4e1a\u8fd0\u52bf\u5982\u4f55\u3002\u63a5\u4e0b\u67652-3\u5e74\u5e94\u8be5\u4e3b\u52a8\u8df3\u69fd/\u521b\u4e1a\u8fd8\u662f\u7a33\u624e\u7a33\u6253\uff1f`;
  } else if (mode === 'wealth') {
    systemPrompt += `\n\n\u4e13\u9898\u6df1\u5ea6\u89e3\u8bfb\uff1a\u8d22\u8fd0\u5206\u6790\uff08\u9488\u5bf9${genderCn}\u547d\uff09

\u6b64\u4e3a${genderLabel}\u3002${req.body.gender === 'male' ? '\u7537\u547d\u6b63\u8d22\u65e2\u4ee3\u8868\u7a33\u5b9a\u6536\u5165\u4e5f\u4ee3\u8868\u59bb\u5b50\uff0c\u504f\u8d22\u4ee3\u8868\u610f\u5916\u4e4b\u8d22\u548c\u6295\u8d44\u6536\u76ca\u3002' : '\u5973\u547d\u6b63\u8d22\u7eaf\u7cb9\u4ee3\u8868\u7a33\u5b9a\u6536\u5165\u548c\u7406\u8d22\u80fd\u529b\uff0c\u504f\u8d22\u4ee3\u8868\u6295\u8d44\u6536\u76ca\u548c\u989d\u5916\u6536\u5165\u3002'}

\u4f60\u5fc5\u987b\u9010\u4e00\u56de\u7b54\u4ee5\u4e0b\u95ee\u9898\uff08\u7528\u6e05\u6670\u7684\u5c0f\u6807\u9898\u5206\u9694\u6bcf\u4e2a\u95ee\u9898\uff09\uff1a

1. \u8d22\u8fd0\u5929\u8d4b\uff1a\u5206\u6790\u547d\u4e3b\u5929\u751f\u7684\u8d5a\u94b1\u80fd\u529b\u548c\u7406\u8d22\u98ce\u683c\u3002\u662f\u7a33\u624e\u7a33\u6253\u9760\u6b63\u8d22\uff08\u5de5\u8d44/\u4e3b\u4e1a\uff09\u8fd8\u662f\u504f\u8d22\u8fd0\u5f3a\uff08\u6295\u8d44/\u526f\u4e1a/\u610f\u5916\u4e4b\u8d22\uff09\uff1f\u65e5\u4e3b\u662f\u5426\u6709\u8db3\u591f\u7684\u529b\u91cf\u201c\u62c5\u8d22\u201d\uff1f\u8eab\u5f31\u8d22\u65fa\u610f\u5473\u7740\u8d22\u6765\u8d22\u53bb\uff0c\u8eab\u5f3a\u8d22\u65fa\u624d\u80fd\u771f\u6b63\u7559\u4f4f\u94b1\u3002
2. \u6700\u4f73\u8d5a\u94b1\u65b9\u5f0f\uff1a\u6839\u636e\u7528\u795e\u4e94\u884c\u548c\u5341\u795e\u683c\u5c40\uff0c\u5206\u6790\u6700\u9002\u5408\u547d\u4e3b\u7684\u8d5a\u94b1\u9014\u5f84\u3002\u662f\u9760\u6280\u672f/\u624b\u827a\uff08\u98df\u4f24\u751f\u8d22\uff09\u3001\u9760\u7ba1\u7406/\u6743\u529b\uff08\u5b98\u661f\u751f\u5370\uff09\u3001\u9760\u6295\u8d44/\u4eba\u8109\uff08\u504f\u8d22\uff09\u3001\u8fd8\u662f\u9760\u521b\u4e1a\uff08\u6bd4\u52ab\u5e2e\u8eab\u914d\u8d22\u661f\uff09\uff1f\u7ed9\u51fa\u5177\u4f53\u53ef\u64cd\u4f5c\u7684\u5efa\u8bae\u3002
3. \u8d22\u8fd0\u9ad8\u5cf0\u671f\uff1a\u9010\u6b65\u5206\u6790\u6bcf\u6b65\u5927\u8fd0\u4e2d\u7684\u8d22\u8fd0\u6ce2\u52a8\u3002\u54ea\u4e9b\u5e74\u9f84\u6bb5\u8d22\u8fd0\u6700\u65fa\uff1f\u662f\u6b63\u8d22\u65fa\uff08\u52a0\u85aa/\u664b\u5347\uff09\u8fd8\u662f\u504f\u8d22\u65fa\uff08\u6295\u8d44\u56de\u62a5/\u610f\u5916\u6536\u83b7\uff09\uff1f\u7ed9\u51fa\u5177\u4f53\u7684\u5e74\u9f84\u8303\u56f4\u3002
4. \u7834\u8d22\u98ce\u9669\u671f\uff1a\u54ea\u4e9b\u5927\u8fd0\u5e74\u4efd\u5bb9\u6613\u7834\u8d22\u3001\u4e8f\u635f\u3001\u88ab\u9a97\uff1f\u5206\u6790\u52ab\u8d22\u3001\u6bd4\u80a9\u593a\u8d22\u7684\u98ce\u9669\u3002\u662f\u5426\u6709\u5927\u8fd0\u51b2\u8d22\u661f\u7684\u5371\u9669\u5e74\u4efd\uff1f\u5982\u4f55\u63d0\u524d\u505a\u597d\u8d22\u52a1\u9632\u62a4\uff1f
5. \u6295\u8d44\u503e\u5411\uff1a\u547d\u4e3b\u9002\u5408\u4ec0\u4e48\u7c7b\u578b\u7684\u6295\u8d44\uff1f\u4fdd\u5b88\u578b\uff08\u5b58\u6b3e/\u503a\u5238\uff09\u8fd8\u662f\u6fc0\u8fdb\u578b\uff08\u80a1\u7968/\u52a0\u5bc6\u8d27\u5e01/\u521b\u4e1a\uff09\uff1f\u6839\u636e\u547d\u76d8\u4e2d\u7684\u8d22\u661f\u548c\u5b98\u6740\u5173\u7cfb\uff0c\u5206\u6790\u98ce\u9669\u627f\u53d7\u80fd\u529b\u3002
6. \u589e\u8d22\u7b56\u7565\uff1a\u57fa\u4e8e\u7528\u795e\u4e94\u884c\uff0c\u7ed9\u51fa\u5177\u4f53\u7684\u589e\u8d22\u5efa\u8bae\u3002\u5305\u62ec\u6709\u5229\u7684\u65b9\u4f4d\uff08\u9002\u5408\u5728\u54ea\u4e2a\u65b9\u5411\u5de5\u4f5c/\u6295\u8d44\uff09\u3001\u989c\u8272\uff08\u7a7f\u7740/\u529e\u516c\u73af\u5883\uff09\u3001\u6570\u5b57\u3001\u884c\u4e1a\u9009\u62e9\u3002\u4ec0\u4e48\u65f6\u5019\u9002\u5408\u5192\u9669\uff0c\u4ec0\u4e48\u65f6\u5019\u5e94\u8be5\u5b88\u8d22\uff1f`;
  }

  const birthTimeStr = `${String(req.body.birthHour || 0).padStart(2,'0')}:${String(req.body.birthMinute || 0).padStart(2,'0')}`;

  const userPrompt = `\u547d\u4e3b\u4fe1\u606f (Chart Owner):
- \u6027\u522b (Gender): ${genderLabel} (${genderEn})
- \u51fa\u751f\u65e5\u671f (Birth Date): ${req.body.birthYear}\u5e74${req.body.birthMonth}\u6708${req.body.birthDay}\u65e5
- \u51fa\u751f\u65f6\u95f4 (Birth Time): ${birthTimeStr}

\u516b\u5b57\u56db\u67f1 (Four Pillars):
\u5e74\u67f1 (Year):  ${pillars.year.stemCn}${pillars.year.branchCn} (${pillars.year.stem} ${pillars.year.branch}) - ${pillars.year.animal}
\u6708\u67f1 (Month): ${pillars.month.stemCn}${pillars.month.branchCn} (${pillars.month.stem} ${pillars.month.branch})
\u65e5\u67f1 (Day):   ${pillars.day.stemCn}${pillars.day.branchCn} (${pillars.day.stem} ${pillars.day.branch})
\u65f6\u67f1 (Hour):  ${pillars.hour.stemCn}${pillars.hour.branchCn} (${pillars.hour.stem} ${pillars.hour.branch})

\u65e5\u5143 (Day Master): ${pillars.day.stemCn} ${pillars?.day?.stem || 'Unknown'} (${dayMaster?.element || 'Unknown'}) - ${dayMaster?.strength || 'Unknown'}

\u4e94\u884c\u5206\u5e03 (Five Elements):
${elementLines}

\u5341\u795e (Ten Gods - strongest):
${tenGodLines}

\u5927\u8fd0 (Luck Cycles - each ~10 years):
${luckLines}

Please provide a thorough, personalized interpretation of this ${genderEn.toLowerCase()}'s chart. Tailor all analysis, recommendations, and advice specifically to this person based on their gender, birth details, and chart data above.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-No-Fallback': 'true',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      throw new Error(errMsg);
    }

    let content = data?.choices?.[0]?.message?.content || 'No interpretation generated.';

    // Strip DeepSeek R1 thinking blocks
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    res.json({ interpretation: content });
  } catch (err) {
    console.error('AI interpretation error:', err);
    res.status(500).json({ error: 'AI interpretation failed: ' + err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3888;
app.listen(PORT, () => {
  console.log(`\n  Ba Zi Reader running at http://localhost:${PORT}\n`);
});
