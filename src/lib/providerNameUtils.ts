// Provider name parsing and formatting utilities
// Pure function module safe for both Client and Server Components

export const KNOWN_NAME_MAP: Record<string, { lastName: string; firstName: string }> = {
  'cavanaughmar': { lastName: 'Cavanaugh', firstName: 'Mark' },
  'tallacksondon': { lastName: 'Tallackson', firstName: 'Donald' },
  'shenoyvik': { lastName: 'Shenoy', firstName: 'Vikram' },
  'bernellmic': { lastName: 'Bernell', firstName: 'Michael' },
  'alanizped': { lastName: 'Alaniz', firstName: 'Pedro' },
  'taylormat': { lastName: 'Taylor', firstName: 'Matthew' },
  'changale': { lastName: 'Chang', firstName: 'Alex' },
  'chuanjos': { lastName: 'Chuan', firstName: 'Joseph' },
  'hillerken': { lastName: 'Hiller', firstName: 'Kenneth' },
  'hirschdou': { lastName: 'Hirsch', firstName: 'Douglas' },
  'jeffcoatshe': { lastName: 'Jeffcoat', firstName: 'Sherwood' },
  'lukey': { lastName: 'Lu', firstName: 'Key' },
  'mankariousram': { lastName: 'Mankarious', firstName: 'Ramy' },
  'dwarakanathkis': { lastName: 'Dwarakanath', firstName: 'Kishore' },
  'rameshrek': { lastName: 'Ramesh', firstName: 'Rekha' },
  'shevchenkoyev': { lastName: 'Shevchenko', firstName: 'Yevgeniy' },
  'gunncli': { lastName: 'Gunn', firstName: 'Clinton' },
  'martinezrog': { lastName: 'Martinez', firstName: 'Rogelio' },
  'patelpur': { lastName: 'Patel', firstName: 'Purnal' },
  'broussardmic': { lastName: 'Broussard', firstName: 'Michael' },
  'riveraliz': { lastName: 'Rivera', firstName: 'Liz' },
  'atagasas': { lastName: 'Ataga', firstName: 'Sasa' },
  'hartsgrovemar': { lastName: 'Hartsgrove', firstName: 'Mark' },
  'holtonjac': { lastName: 'Holton', firstName: 'Jacqueline' },
  'hughesabi': { lastName: 'Hughes', firstName: 'Abigail' },
  'lamhun': { lastName: 'Lam', firstName: 'Hung' },
  'litin': { lastName: 'Li', firstName: 'Tina' },
  'lowelei': { lastName: 'Lowe', firstName: 'Leila' },
  'markettecha': { lastName: 'Markette', firstName: 'Charles' },
  'mateocar': { lastName: 'Mateo', firstName: 'Carmen' },
  'mcguiremeg': { lastName: 'McGuire', firstName: 'Megan' },
  'normandken': { lastName: 'Normand', firstName: 'Kenneth' },
  'pateljin': { lastName: 'Patel', firstName: 'Jinal' },
  'rojasart': { lastName: 'Rojas', firstName: 'Arthur' },
  'schroedtertim': { lastName: 'Schroedter', firstName: 'Timothy' },
  'tamtom': { lastName: 'Tam', firstName: 'Tommy' },
  'townechr': { lastName: 'Towne', firstName: 'Christopher' },
  'shirakmic': { lastName: 'Shirak', firstName: 'Mic' },
  'vuan': { lastName: 'Vu', firstName: 'An' },
  'vuand': { lastName: 'Vu', firstName: 'An' },
  'yiale': { lastName: 'Yi', firstName: 'Alex' },
  'zemraulud': { lastName: 'Zemrau', firstName: 'Ludwig' },
  'floresma.': { lastName: 'Flores', firstName: 'Maria' },
  'floresma': { lastName: 'Flores', firstName: 'Maria' },
  'staesbob': { lastName: 'Staes', firstName: 'Bob' },
  'flemmingcin': { lastName: 'Flemming', firstName: 'Cindy' },
  'louiskes': { lastName: 'Louis', firstName: 'Kes' },
  'vantasselchr': { lastName: 'Van Tassel', firstName: 'Christopher' },
  'ndujiubaeny': { lastName: 'Ndujiuba', firstName: 'Enyinnaya' }
};

export const COMMON_FIRST_NAME_MAP: Record<string, string> = {
  'abi': 'Abigail',
  'ada': 'Adam',
  'aja': 'Ajay',
  'ala': 'Alan',
  'ale': 'Alex',
  'ali': 'Ali',
  'all': 'Allison',
  'ama': 'Amanda',
  'amb': 'Amber',
  'amm': 'Ammer',
  'and': 'Andrew',
  'ang': 'Angela',
  'ann': 'Ann',
  'ant': 'Anthony',
  'art': 'Arthur',
  'ash': 'Ashley',
  'bab': 'Babatunde',
  'ben': 'Benjamin',
  'bil': 'Billy',
  'bin': 'Binu',
  'bob': 'Bob',
  'bra': 'Brandon',
  'bre': 'Brenda',
  'bri': 'Brian',
  'car': 'Carmen',
  'cha': 'Charles',
  'che': 'Chelsea',
  'chi': 'Chinedu',
  'chr': 'Christopher',
  'cin': 'Cindy',
  'cla': 'Clara',
  'cli': 'Clinton',
  'cyn': 'Cynthia',
  'dam': 'Damian',
  'dan': 'Daniel',
  'dar': 'Darrin',
  'dav': 'David',
  'dea': 'Dean',
  'deb': 'Deborah',
  'don': 'Donald',
  'dor': 'Doris',
  'dou': 'Douglas',
  'duk': 'Duke',
  'dwi': 'Dwight',
  'edg': 'Edgardo',
  'edw': 'Edward',
  'eli': 'Elizabeth',
  'emm': 'Emmanuel',
  'eny': 'Enyinnaya',
  'eri': 'Eric',
  'eva': 'Eva',
  'fra': 'Frank',
  'fre': 'Fred',
  'gil': 'Gilbert',
  'gla': 'Gladys',
  'gra': 'Grace',
  'gre': 'Gregory',
  'gud': 'Gudrun',
  'had': 'Hadi',
  'hen': 'Henry',
  'hoa': 'Hoa',
  'hug': 'Hugh',
  'hun': 'Hung',
  'huy': 'Huy',
  'jac': 'Jacqueline',
  'jam': 'James',
  'jas': 'Jason',
  'jay': 'Jay',
  'jen': 'Jennifer',
  'jes': 'Jessica',
  'jin': 'Jinal',
  'joh': 'John',
  'jon': 'Jonathan',
  'jor': 'Jordan',
  'jos': 'Joseph',
  'jul': 'Julian',
  'jus': 'Justin',
  'kar': 'Karen',
  'kas': 'Kasandra',
  'kat': 'Katherine',
  'kay': 'Kayla',
  'ken': 'Kenneth',
  'kes': 'Kesiah',
  'kev': 'Kevin',
  'kim': 'Kimberly',
  'kis': 'Kishore',
  'kry': 'Krystal',
  'lac': 'Lacey',
  'lad': 'Ladd',
  'lam': 'Lamar',
  'lea': 'Leah',
  'lei': 'Leila',
  'len': 'Leonard',
  'les': 'Leslie',
  'liz': 'Liz',
  'lor': 'Lori',
  'luc': 'Lucy',
  'lud': 'Ludwig',
  'lyn': 'Lynn',
  'mah': 'Mahmoud',
  'mar': 'Mark',
  'mat': 'Matthew',
  'mee': 'Meenakshi',
  'meg': 'Megan',
  'mel': 'Melissa',
  'mer': 'Meredith',
  'mic': 'Michael',
  'min': 'Min',
  'mou': 'Moustafa',
  'nas': 'Nasir',
  'nes': 'Nesta',
  'nic': 'Nicholas',
  'obi': 'Obinna',
  'pad': 'Padma',
  'pat': 'Patrick',
  'pau': 'Paul',
  'pet': 'Peter',
  'phe': 'Phebe',
  'phi': 'Philip',
  'phu': 'Phuc',
  'pin': 'Ping',
  'pra': 'Prashant',
  'pri': 'Priya',
  'pur': 'Purnal',
  'qua': 'Quang',
  'ram': 'Ramy',
  'ran': 'Randy',
  'rek': 'Rekha',
  'ren': 'Renee',
  'rho': 'Rhonda',
  'ric': 'Richard',
  'rob': 'Robert',
  'rod': 'Rodney',
  'rog': 'Rogelio',
  'rol': 'Rolando',
  'ros': 'Rose',
  'sad': 'Sadia',
  'sam': 'Samuel',
  'sar': 'Sarah',
  'sas': 'Sasa',
  'sat': 'Satinder',
  'sco': 'Scott',
  'sha': 'Sharon',
  'she': 'Sherwood',
  'sta': 'Stanley',
  'ste': 'Stephen',
  'sum': 'Suman',
  'sus': 'Susan',
  'tah': 'Tahir',
  'ter': 'Teresa',
  'tho': 'Thomas',
  'thu': 'Thu',
  'tif': 'Tiffany',
  'tim': 'Timothy',
  'tin': 'Tina',
  'tom': 'Tommy',
  'ton': 'Tony',
  'tri': 'Trisha',
  'val': 'Valerie',
  'van': 'Vanessa',
  'vee': 'Veena',
  'ven': 'Venkata',
  'ver': 'Veronica',
  'vic': 'Victor',
  'wen': 'Wendy',
  'wil': 'William',
  'win': 'Winnie',
  'yan': 'Yan',
  'yeu': 'Yeung',
  'yev': 'Yevgeniy',
  'yul': 'Yulia',
  'yur': 'Yuriy',
  'yve': 'Yvette',
  'zac': 'Zachary',
  'zan': 'Zane',
  'zbi': 'Zbigniew'
};

export function formatProviderName(rawId: string): {
  displayName: string;
  lastName: string;
  firstName: string;
  initials: string;
} {
  // Strip annotations like [P], [C], [RES], [SRNA], [L], [RC]
  const clean = rawId.replace(/\[.*?\]/g, '').trim();
  const lower = clean.toLowerCase();

  // Check known name map
  if (KNOWN_NAME_MAP[lower]) {
    const k = KNOWN_NAME_MAP[lower];
    const initial = k.firstName ? `${k.firstName[0]}.` : '';
    return {
      displayName: `${k.lastName.toUpperCase()} ${initial}`.trim(),
      lastName: k.lastName,
      firstName: k.firstName,
      initials: (k.firstName[0] || '') + (k.lastName[0] || '')
    };
  }

  // Check for space-separated "First Last" or "Last, First":
  if (clean.includes(' ')) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0].replace(/,$/, '');
      const last = parts.slice(1).join(' ');
      return {
        displayName: `${last.toUpperCase()} ${first[0].toUpperCase()}.`,
        lastName: last,
        firstName: first,
        initials: (first[0] || '') + (last[0] || '')
      };
    }
  }

  // Deconstruct PascalCase into segments: e.g. "VanTasselChr", "CavanaughMar", "NdujiubaEny", "DeLaRosaDan"
  const words = clean.match(/[A-Z][a-z]*/g);
  if (words && words.length >= 2) {
    const lastWord = words[words.length - 1];
    if (lastWord.length <= 4 || words.length >= 2) {
      const rawFirst = lastWord;
      const firstLookup = rawFirst.toLowerCase();
      const firstName = COMMON_FIRST_NAME_MAP[firstLookup] || 
        (rawFirst[0].toUpperCase() + rawFirst.slice(1).toLowerCase());

      const lastWords = words.slice(0, words.length - 1);
      let lastName = '';
      for (let i = 0; i < lastWords.length; i++) {
        const w = lastWords[i];
        if (w.toLowerCase() === 'mc' && i + 1 < lastWords.length) {
          lastName += (lastName ? ' ' : '') + w + lastWords[i + 1];
          i++;
        } else {
          lastName += (lastName ? ' ' : '') + w;
        }
      }

      return {
        displayName: `${lastName.toUpperCase()} ${firstName ? firstName[0].toUpperCase() + '.' : ''}`.trim(),
        lastName,
        firstName,
        initials: (firstName[0] || '') + (lastName[0] || '')
      };
    }
  }

  return {
    displayName: clean.toUpperCase(),
    lastName: clean,
    firstName: '',
    initials: clean.substring(0, 2).toUpperCase()
  };
}
