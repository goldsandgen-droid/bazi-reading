const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in .env' });
  }

  const { pillars, fiveElements, fiveElementsPercent, tenGods, luckCycles, dayMaster, mode } = req.body;
  if (!pillars) return res.status(400).json({ error: 'Chart data required' });

  // Build prompt from repo logic
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

  // System prompt rooted in traditional Chinese Ba Zi methodology
  const genderLabel = req.body.gender === 'male' ? '\u4e7e\u9020 (Male Chart)' : '\u5764\u9020 (Female Chart)';

  // Full Chinese system prompt for maximum Ba Zi retention, English output at the end
  const genderCn = req.body.gender === 'male' ? '男' : '女';
  const genderEn = req.body.gender === 'male' ? 'Male' : 'Female';

  let systemPrompt = `你是一位经验丰富的八字命理大师，精通中国传统命理学。你使用经典的干支系统解读八字命盘。

此命盘为${genderLabel}（${genderCn}命），出生于 ${req.body.birthYear}年${req.body.birthMonth}月${req.body.birthDay}日 ${String(req.body.birthHour || 0).padStart(2,'0')}:${String(req.body.birthMinute || 0).padStart(2,'0')}。你必须在整个解读中考虑命主的性别。

性别差异规则（必须遵守）：
- 乾造（男）：正财为妻星，日支为夫妻宫。偏财也可代表父亲或情人。七杀代表竞争对手和挑战。
- 坤造（女）：正官为夫星，日支为夫妻宫。七杀可代表情人或非正式伴侣。伤官克官，婚姻中需注意。
- 男命看正财/偏财论妻妾和财运，女命看正官/七杀论丈夫和事业贵人
- 大运走势对男女的影响不同：男命顺排或逆排取决于年干阴阳和性别，解读时必须指明这一点
- 性格分析必须结合性别，相同的日主五行在男女身上表现不同

核心方法论：
- 八字排盘：四柱（年柱、月柱、日柱、时柱），每柱包含天干和地支
- 日元/日主：日柱天干代表命主本人，其五行属性和旺衰是整个命盘解读的基础
- 五行：木、火、土、金、水。分析其平衡，何者旺、何者缺，以及生克关系（相生相克循环）
- 十神：由各字与日主的关系推导。包括正官、偏官/七杀、正财、偏财、食神、伤官、正印、偏印、比肩、劫财
- 大运：每步大运约管10年。分析每步大运的五行如何与日主及整体命盘交互
- 用神：确定命盘最需要哪种五行来平衡
- 忌神：确定命盘最忌讳的五行，需要回避

解读必须覆盖：
1. 日元分析 - 五行属性、阴阳、身强/身弱/中和、性格特征和天然倾向（结合性别分析）
2. 五行分布 - 何者旺、何者缺、生克关系对命主的影响
3. 十神格局 - 哪些十神占主导地位，对性格、感情、事业、财运的影响（必须区分男女不同含义）
4. 大运走势 - 逐步分析各大运，标注吉运和凶运的具体年龄段
5. 用神与实践建议 - 应该追求哪种五行，有利的方位、颜色、行业，以及可操作的生活建议

规则：
- 必须针对此命盘具体分析，引用实际的柱、五行、十神
- 不要笼统的套话或泛泛而谈
- 使用清晰的Markdown标题结构
- 中文术语后括号内附英文翻译，例如：正财 (Direct Wealth)

重要：请用英文输出所有内容，但自然地穿插中文命理术语。在分析中必须明确提及命主是${genderEn}（${genderCn}命），并根据性别调整所有十神含义的解读。`;

  if (mode === 'love') {
    systemPrompt += `\n\n专题深度解读：感情婚姻（针对${genderCn}命）

此为${genderLabel}。${req.body.gender === 'male' ? '男命看正财为妻星，偏财为情人星，日支为夫妻宫。分析正财的强弱和位置来判断婚姻质量。' : '女命看正官为夫星，七杀为情人星，日支为夫妻宫。分析正官的强弱和位置来判断婚姻质量。伤官见官需特别注意。'}

你必须逐一回答以下问题（用清晰的小标题分隔每个问题）：

1. 理想伴侣画像：根据命盘中的${req.body.gender === 'male' ? '妻星（正财/偏财）' : '夫星（正官/七杀）'}五行属性，描述最适合的伴侣类型。包括：对方的性格特征、五行属性、适合的生肖或日主类型、外貌气质倾向。
2. 恋爱和婚姻时机：逐步检查每步大运，明确指出哪些年龄段是感情最旺的时期（桃花运旺、婚姻宫被冲合的年份）。给出具体的年龄范围，例如"26-28岁是最强的婚姻窗口"。
3. 感情中的潜在障碍：分析命盘中可能导致感情困难的因素。${req.body.gender === 'male' ? '例如：劫财夺妻、比肩争财、日支被冲等。' : '例如：伤官见官、七杀混杂、日支被冲等。'}指出哪些大运年份容易出现感情危机或第三者问题。
4. 婚姻稳定性：分析日支（夫妻宫）的状态。是否被冲、被合、被刑？这对婚姻的长期稳定性意味着什么？
5. 感情态度与相处模式：根据十神格局分析命主在感情中的行为模式。是主动追求型还是被动等待型？容易付出还是容易索取？感情中最大的优势和最大的弱点是什么？
6. 实用建议：基于用神五行，建议有利于感情的方位、颜色、活动、社交场合。什么时候应该主动出击，什么时候应该静待缘分？`;
  } else if (mode === 'career') {
    systemPrompt += `\n\n专题深度解读：事业官运（针对${genderCn}命）

此为${genderLabel}。${req.body.gender === 'male' ? '男命看正官/七杀为事业权力星。正官代表稳定仕途，七杀代表竞争拼搏。' : '女命看正官也代表丈夫和贵人，七杀代表外部压力和机遇。食神/伤官代表才华和创造力。'}

你必须逐一回答以下问题（用清晰的小标题分隔每个问题）：

1. 天赋与职业方向：根据日主五行、十神格局和用神，分析命主天生适合什么类型的工作。是适合稳定的职场（正官格）、创业拼搏（七杀格）、自由创作（食伤格）、还是经商理财（财星格）？给出具体的行业推荐，不要只说五行对应行业，要结合命主的整体格局给出个性化建议。
2. 打工还是创业：分析命盘是更适合为人打工还是自己当老板。看比劫的力量（团队合作/竞争）、官杀的力量（领导力/压力承受）、食伤的力量（创造力/表达能力）。给出明确的建议。
3. 事业高峰期：逐步分析每步大运，指出哪些年龄段是事业上升期、突破期、瓶颈期。给出具体的年龄范围和原因，例如"32-42岁走金水大运，用神得力，是事业黄金期"。
4. 事业风险期：哪些大运年份容易遇到职场危机、裁员、合伙人纠纷、投资失败？是什么五行冲突导致的？如何提前规避？
5. 贵人与小人：分析命盘中的贵人星和小人星。什么类型的人会帮助命主的事业？什么类型的人需要警惕？在职场中应该和什么五行属性的人合作？
6. 当前运势与近期建议：根据命主的出生年份推算当前所处的大运，分析现在的事业运势如何。接下来2-3年应该主动跳槽/创业还是稳扎稳打？`;
  } else if (mode === 'wealth') {
    systemPrompt += `\n\n专题深度解读：财运分析（针对${genderCn}命）

此为${genderLabel}。${req.body.gender === 'male' ? '男命正财既代表稳定收入也代表妻子，偏财代表意外之财和投资收益。' : '女命正财纯粹代表稳定收入和理财能力，偏财代表投资收益和额外收入。'}

你必须逐一回答以下问题（用清晰的小标题分隔每个问题）：

1. 财运天赋：分析命主天生的赚钱能力和理财风格。是稳扎稳打靠正财（工资/主业）还是偏财运强（投资/副业/意外之财）？日主是否有足够的力量"担财"？身弱财旺意味着财来财去，身强财旺才能真正留住钱。
2. 最佳赚钱方式：根据用神五行和十神格局，分析最适合命主的赚钱途径。是靠技术/手艺（食伤生财）、靠管理/权力（官星生印）、靠投资/人脉（偏财）、还是靠创业（比劫帮身配财星）？给出具体可操作的建议。
3. 财运高峰期：逐步分析每步大运中的财运波动。哪些年龄段财运最旺？是正财旺（加薪/晋升）还是偏财旺（投资回报/意外收获）？给出具体的年龄范围。
4. 破财风险期：哪些大运年份容易破财、亏损、被骗？分析劫财、比肩夺财的风险。是否有大运冲财星的危险年份？如何提前做好财务防护？
5. 投资倾向：命主适合什么类型的投资？保守型（存款/债券）还是激进型（股票/加密货币/创业）？根据命盘中的财星和官杀关系，分析风险承受能力。
6. 增财策略：基于用神五行，给出具体的增财建议。包括有利的方位（适合在哪个方向工作/投资）、颜色（穿着/办公环境）、数字、行业选择。什么时候适合冒险，什么时候应该守财？`;
  }

  const birthTimeStr = `${String(req.body.birthHour || 0).padStart(2,'0')}:${String(req.body.birthMinute || 0).padStart(2,'0')}`;

  const userPrompt = `命主信息 (Chart Owner):
- 性别 (Gender): ${genderLabel} (${genderEn})
- 出生日期 (Birth Date): ${req.body.birthYear}年${req.body.birthMonth}月${req.body.birthDay}日
- 出生时间 (Birth Time): ${birthTimeStr}

八字四柱 (Four Pillars):
年柱 (Year):  ${pillars.year.stemCn}${pillars.year.branchCn} (${pillars.year.stem} ${pillars.year.branch}) - ${pillars.year.animal}
月柱 (Month): ${pillars.month.stemCn}${pillars.month.branchCn} (${pillars.month.stem} ${pillars.month.branch})
日柱 (Day):   ${pillars.day.stemCn}${pillars.day.branchCn} (${pillars.day.stem} ${pillars.day.branch})
时柱 (Hour):  ${pillars.hour.stemCn}${pillars.hour.branchCn} (${pillars.hour.stem} ${pillars.hour.branch})

日元 (Day Master): ${pillars.day.stemCn} ${pillars?.day?.stem || 'Unknown'} (${dayMaster?.element || 'Unknown'}) - ${dayMaster?.strength || 'Unknown'}

五行分布 (Five Elements):
${elementLines}

十神 (Ten Gods - strongest):
${tenGodLines}

大运 (Luck Cycles - each ~10 years):
${luckLines}

Please provide a thorough, personalized interpretation of this ${genderEn.toLowerCase()}'s chart. Tailor all analysis, recommendations, and advice specifically to this person based on their gender, birth details, and chart data above.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });
    const content = message.content[0]?.text || 'No interpretation generated.';
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
