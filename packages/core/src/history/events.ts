/**
 * Dated events in Sikh history, for "this week in Sikh history".
 *
 * Every date is Gregorian (Common Era) and was checked against the linked
 * Wikipedia article (scripts/check-history-dates.mjs). Gurpurabs follow the
 * lunar calendar and move from year to year, so they aren't listed here.
 */

export type HistoryTag = "gurus" | "shaheedi" | "battle" | "raj" | "panth" | "punjab" | "diaspora" | "1984";

export interface HistoryEvent {
  id: string;
  /** YYYY-MM-DD, Gregorian. */
  date: string;
  title: string;
  summary: string;
  /** Wikipedia article title, used as the source link. */
  wiki: string;
  tags: HistoryTag[];
}

export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    id: "guru-arjan-shaheedi",
    date: "1606-05-30",
    title: "Shaheedi of Guru Arjan Dev Ji",
    summary:
      "The fifth Guru, who compiled the Adi Granth and built Sri Harmandir Sahib, was tortured and martyred in Lahore on the orders of the Mughal emperor Jahangir.",
    wiki: "Guru Arjan",
    tags: ["gurus", "shaheedi"],
  },
  {
    id: "guru-tegh-bahadur-shaheedi",
    date: "1675-11-11",
    title: "Shaheedi of Guru Tegh Bahadur Ji",
    summary:
      "The ninth Guru was publicly executed in Delhi's Chandni Chowk under Aurangzeb after standing up for the freedom of Kashmiri Pandits to practise their faith. Gurdwara Sis Ganj Sahib marks the place.",
    wiki: "Guru Tegh Bahadur",
    tags: ["gurus", "shaheedi"],
  },
  {
    id: "khalsa-1699",
    date: "1699-04-13",
    title: "Guru Gobind Singh Ji creates the Khalsa",
    summary:
      "At Anandpur Sahib on Vaisakhi, Guru Gobind Singh Ji initiated the Panj Pyare with Khande di Pahul and then took Amrit from them, founding the Khalsa.",
    wiki: "Khalsa",
    tags: ["gurus", "panth"],
  },
  {
    id: "chhote-sahibzade",
    date: "1704-12-26",
    title: "Shaheedi of the Chhote Sahibzade",
    summary:
      "Baba Zorawar Singh and Baba Fateh Singh, the Guru's younger sons, aged nine and six, were bricked alive at Sirhind for refusing to give up Sikhi. Mata Gujri Ji passed away in captivity.",
    wiki: "Zorawar Singh (Sikhism)",
    tags: ["gurus", "shaheedi"],
  },
  {
    id: "guru-gobind-singh-jyoti-jot",
    date: "1708-10-07",
    title: "Guru Gobind Singh Ji leaves the world; Guruship passes to Guru Granth Sahib",
    summary:
      "At Nanded, the tenth Guru passed away after an assassination attempt, having declared Sri Guru Granth Sahib Ji the eternal Guru of the Sikhs.",
    wiki: "Guru Gobind Singh",
    tags: ["gurus"],
  },
  {
    id: "chappar-chiri",
    date: "1710-05-12",
    title: "Battle of Chappar Chiri",
    summary:
      "Banda Singh Bahadur's Khalsa army defeated and killed Wazir Khan, the governor of Sirhind responsible for the Sahibzade's execution, and took Sirhind.",
    wiki: "Battle of Chappar Chiri",
    tags: ["battle"],
  },
  {
    id: "banda-singh-shaheedi",
    date: "1716-06-09",
    title: "Shaheedi of Banda Singh Bahadur",
    summary:
      "After months of imprisonment in Delhi, Banda Singh Bahadur was tortured and executed with his companions. His young son was killed before him.",
    wiki: "Banda Singh Bahadur",
    tags: ["shaheedi"],
  },
  {
    id: "baba-deep-singh",
    date: "1757-11-13",
    title: "Shaheedi of Baba Deep Singh Ji",
    summary:
      "Baba Deep Singh Ji led Sikhs to free Sri Harmandir Sahib from Afghan desecration and fell near the Darbar Sahib, having vowed to reach it.",
    wiki: "Baba Deep Singh",
    tags: ["shaheedi", "battle"],
  },
  {
    id: "vadda-ghallughara",
    date: "1762-02-05",
    title: "Vadda Ghallughara, the Great Holocaust",
    summary:
      "Ahmad Shah Abdali's forces attacked Sikh families near Kup, killing many thousands of Sikhs, most of them women, children and the elderly, in a single day.",
    wiki: "Vadda Ghallughara",
    tags: ["shaheedi"],
  },
  {
    id: "delhi-fateh-1783",
    date: "1783-03-11",
    title: "Sikh misls take Delhi",
    summary:
      "Under Baghel Singh, Jassa Singh Ahluwalia and Jassa Singh Ramgarhia, the Khalsa entered Delhi and the Red Fort. Baghel Singh later built gurdwaras at Sikh sites in the city.",
    wiki: "Battle of Delhi (1783)",
    tags: ["battle"],
  },
  {
    id: "ranjit-singh-maharaja",
    date: "1801-04-12",
    title: "Ranjit Singh proclaimed Maharaja of Punjab",
    summary: "Ranjit Singh was invested as Maharaja at Lahore on Vaisakhi, founding the Sikh Empire.",
    wiki: "Ranjit Singh",
    tags: ["punjab"],
  },
  {
    id: "treaty-of-amritsar",
    date: "1809-04-25",
    title: "Treaty of Amritsar",
    summary: "Maharaja Ranjit Singh and the British East India Company fixed the Sutlej as the boundary between their territories.",
    wiki: "Treaty of Amritsar (1809)",
    tags: ["punjab", "raj"],
  },
  {
    id: "hari-singh-nalwa",
    date: "1837-04-30",
    title: "Hari Singh Nalwa falls at Jamrud",
    summary:
      "The Sikh Empire's great general, who had carried its frontier to the Khyber Pass, was killed defending Jamrud against the Afghans.",
    wiki: "Hari Singh Nalwa",
    tags: ["battle"],
  },
  {
    id: "ranjit-singh-death",
    date: "1839-06-27",
    title: "Maharaja Ranjit Singh passes away",
    summary: "The Lion of Punjab died in Lahore after ruling for nearly four decades. His samadhi stands beside the Badshahi Mosque.",
    wiki: "Ranjit Singh",
    tags: ["punjab"],
  },
  {
    id: "mudki",
    date: "1845-12-18",
    title: "Battle of Mudki",
    summary: "The first battle of the First Anglo-Sikh War, fought between the Sikh Khalsa Army and the East India Company.",
    wiki: "Battle of Mudki",
    tags: ["battle", "raj"],
  },
  {
    id: "ferozeshah",
    date: "1845-12-21",
    title: "Battle of Ferozeshah",
    summary: "A two-day battle of the First Anglo-Sikh War in which the Khalsa Army nearly defeated the British before its commanders withdrew.",
    wiki: "Battle of Ferozeshah",
    tags: ["battle", "raj"],
  },
  {
    id: "aliwal",
    date: "1846-01-28",
    title: "Battle of Aliwal",
    summary: "British forces under Harry Smith defeated a Sikh army on the Sutlej during the First Anglo-Sikh War.",
    wiki: "Battle of Aliwal",
    tags: ["battle", "raj"],
  },
  {
    id: "sobraon",
    date: "1846-02-10",
    title: "Battle of Sobraon",
    summary:
      "The decisive battle of the First Anglo-Sikh War. Sham Singh Attariwala fell fighting, and the defeat opened Lahore to the British.",
    wiki: "Battle of Sobraon",
    tags: ["battle", "raj"],
  },
  {
    id: "treaty-of-lahore",
    date: "1846-03-09",
    title: "Treaty of Lahore",
    summary: "Ending the First Anglo-Sikh War, the treaty took the Jalandhar Doab and Kashmir from the Sikh Empire and left a British force in Lahore.",
    wiki: "Treaty of Lahore",
    tags: ["raj", "punjab"],
  },
  {
    id: "chillianwala",
    date: "1849-01-13",
    title: "Battle of Chillianwala",
    summary: "One of the bloodiest battles the British fought in India, in the Second Anglo-Sikh War. Neither side won outright.",
    wiki: "Battle of Chillianwala",
    tags: ["battle", "raj"],
  },
  {
    id: "gujrat",
    date: "1849-02-21",
    title: "Battle of Gujrat",
    summary: "The final battle of the Second Anglo-Sikh War. The Sikh army's defeat led to the end of the Sikh Empire.",
    wiki: "Battle of Gujrat",
    tags: ["battle", "raj"],
  },
  {
    id: "annexation-of-punjab",
    date: "1849-03-29",
    title: "The British annex Punjab",
    summary: "Maharaja Duleep Singh, aged ten, was made to give up his kingdom, and Punjab was annexed by the East India Company.",
    wiki: "Duleep Singh",
    tags: ["raj", "punjab"],
  },
  {
    id: "duleep-singh-death",
    date: "1893-10-22",
    title: "Maharaja Duleep Singh dies in Paris",
    summary: "The last Maharaja of the Sikh Empire, who had returned to Sikhi late in life, died in exile in Paris.",
    wiki: "Duleep Singh",
    tags: ["raj"],
  },
  {
    id: "saragarhi",
    date: "1897-09-12",
    title: "Battle of Saragarhi",
    summary: "Twenty-one Sikh soldiers of the 36th Sikhs held a signalling post against thousands of tribesmen and fought to the last man.",
    wiki: "Battle of Saragarhi",
    tags: ["battle", "raj"],
  },
  {
    id: "ghadar-party",
    date: "1913-07-15",
    title: "The Ghadar Party is founded",
    summary: "Punjabi migrants on the Pacific coast of North America, most of them Sikhs, founded a movement to end British rule in India.",
    wiki: "Ghadar Movement",
    tags: ["diaspora", "raj"],
  },
  {
    id: "komagata-maru-arrives",
    date: "1914-05-23",
    title: "The Komagata Maru reaches Vancouver",
    summary:
      "The ship carrying 376 passengers from Punjab, most of them Sikhs, was refused entry to Canada under exclusionary laws and held in the harbour for two months.",
    wiki: "Komagata Maru incident",
    tags: ["diaspora"],
  },
  {
    id: "budge-budge",
    date: "1914-09-29",
    title: "Budge Budge massacre",
    summary: "When the Komagata Maru returned to India, police opened fire on its passengers at Budge Budge near Calcutta, killing about twenty.",
    wiki: "Komagata Maru incident",
    tags: ["diaspora", "raj", "shaheedi"],
  },
  {
    id: "kartar-singh-sarabha",
    date: "1915-11-16",
    title: "Kartar Singh Sarabha is hanged",
    summary: "The 19-year-old Ghadar revolutionary was executed in Lahore Central Jail with six companions.",
    wiki: "Kartar Singh Sarabha",
    tags: ["shaheedi", "raj"],
  },
  {
    id: "jallianwala-bagh",
    date: "1919-04-13",
    title: "Jallianwala Bagh massacre",
    summary:
      "On Vaisakhi, troops under General Dyer fired without warning on a crowd in Amritsar, beside Sri Harmandir Sahib, killing hundreds and wounding over a thousand.",
    wiki: "Jallianwala Bagh massacre",
    tags: ["raj", "shaheedi", "punjab"],
  },
  {
    id: "sgpc-founded",
    date: "1920-11-15",
    title: "The SGPC is formed",
    summary: "Sikhs gathered at the Akal Takht formed the Shiromani Gurdwara Parbandhak Committee to take gurdwaras back from corrupt mahants.",
    wiki: "Shiromani Gurdwara Parbandhak Committee",
    tags: ["panth"],
  },
  {
    id: "akali-dal-founded",
    date: "1920-12-14",
    title: "The Shiromani Akali Dal is founded",
    summary: "Founded as the task force of the gurdwara reform movement, it later became the main Sikh political party.",
    wiki: "Shiromani Akali Dal",
    tags: ["panth"],
  },
  {
    id: "saka-nankana-sahib",
    date: "1921-02-20",
    title: "Saka Nankana Sahib",
    summary:
      "Peaceful Sikhs arriving to free Gurdwara Janam Asthan at Nankana Sahib were massacred by the mahant's hired men. The killings drove the gurdwara reform movement.",
    wiki: "Nankana massacre",
    tags: ["shaheedi", "panth"],
  },
  {
    id: "bhagat-singh",
    date: "1931-03-23",
    title: "Bhagat Singh, Sukhdev and Rajguru are hanged",
    summary: "The revolutionaries were executed in Lahore. Bhagat Singh was 23.",
    wiki: "Bhagat Singh",
    tags: ["shaheedi", "raj"],
  },
  {
    id: "udham-singh",
    date: "1940-07-31",
    title: "Shaheed Udham Singh is hanged",
    summary:
      "Udham Singh, who had survived Jallianwala Bagh, was executed at Pentonville Prison in London for killing Michael O'Dwyer, Punjab's governor at the time of the massacre.",
    wiki: "Udham Singh",
    tags: ["shaheedi", "raj"],
  },
  {
    id: "radcliffe-line",
    date: "1947-08-17",
    title: "Partition line splits Punjab",
    summary:
      "The Radcliffe Line was published, dividing Punjab between India and Pakistan. Nankana Sahib and hundreds of historic gurdwaras were left in Pakistan, and millions of Sikhs were uprooted amid mass killing.",
    wiki: "Radcliffe Line",
    tags: ["punjab"],
  },
  {
    id: "punjab-reorganised",
    date: "1966-11-01",
    title: "Punjab is reorganised",
    summary: "After the Punjabi Suba movement, a Punjabi-speaking state was created, with Haryana and parts of Himachal Pradesh separated.",
    wiki: "Punjabi Suba movement",
    tags: ["punjab", "panth"],
  },
  {
    id: "mandla-v-dowell-lee",
    date: "1983-03-24",
    title: "Mandla v Dowell Lee",
    summary: "The House of Lords ruled that Sikhs are an ethnic group under British race relations law, after a school refused a turbaned Sikh boy.",
    wiki: "Mandla v Dowell-Lee",
    tags: ["diaspora"],
  },
  {
    id: "blue-star-begins",
    date: "1984-06-01",
    title: "Indian Army begins its attack on Darbar Sahib",
    summary:
      "Operation Blue Star began as pilgrims gathered for the Shaheedi Purab of Guru Arjan Dev Ji. Sri Harmandir Sahib and dozens of other gurdwaras across Punjab were attacked.",
    wiki: "Operation Blue Star",
    tags: ["1984", "shaheedi"],
  },
  {
    id: "akal-takht-1984",
    date: "1984-06-06",
    title: "Akal Takht destroyed; Sant Jarnail Singh Bhindranwale killed",
    summary:
      "Tanks shelled the Akal Takht. Sant Jarnail Singh Khalsa Bhindranwale, General Shabeg Singh and Bhai Amrik Singh were killed, along with many pilgrims.",
    wiki: "Operation Blue Star",
    tags: ["1984", "shaheedi"],
  },
  {
    id: "indira-gandhi-assassination",
    date: "1984-10-31",
    title: "Indira Gandhi is assassinated",
    summary: "The prime minister who ordered the attack on Darbar Sahib was shot by her Sikh bodyguards, Beant Singh and Satwant Singh.",
    wiki: "Assassination of Indira Gandhi",
    tags: ["1984"],
  },
  {
    id: "november-1984",
    date: "1984-11-01",
    title: "The anti-Sikh massacres of November 1984",
    summary:
      "Organised mobs, many led by Congress party figures, killed thousands of Sikhs in Delhi and other cities over several days while police stood by. Sikhs remember it as a genocide.",
    wiki: "1984 anti-Sikh riots",
    tags: ["1984", "shaheedi"],
  },
  {
    id: "jaswant-singh-khalra",
    date: "1995-09-06",
    title: "Jaswant Singh Khalra is abducted",
    summary:
      "The human rights activist, who had exposed thousands of secret cremations by Punjab Police, was taken from his home in Amritsar and later killed in custody.",
    wiki: "Jaswant Singh Khalra",
    tags: ["shaheedi", "punjab"],
  },
  {
    id: "oak-creek",
    date: "2012-08-05",
    title: "Oak Creek gurdwara shooting",
    summary: "A white supremacist killed six worshippers at the Sikh Temple of Wisconsin in Oak Creek. A seventh died of his injuries in 2020.",
    wiki: "Wisconsin Sikh temple shooting",
    tags: ["diaspora", "shaheedi"],
  },
  {
    id: "kartarpur-corridor",
    date: "2019-11-09",
    title: "The Kartarpur Corridor opens",
    summary:
      "A visa-free crossing opened for Sikh pilgrims from India to Gurdwara Darbar Sahib Kartarpur in Pakistan, where Guru Nanak Dev Ji spent his last years.",
    wiki: "Kartarpur Corridor",
    tags: ["panth"],
  },
  {
    id: "dilli-chalo",
    date: "2020-11-26",
    title: "Farmers march on Delhi",
    summary: "Farmers, led largely by Punjab's Sikh farmers, began a year-long protest camped at Delhi's borders against three farm laws.",
    wiki: "2020–2021 Indian farmers' protest",
    tags: ["punjab"],
  },
  {
    id: "farm-laws-repealed",
    date: "2021-11-19",
    title: "The farm laws are withdrawn",
    summary: "On Guru Nanak Dev Ji's Gurpurab, the Indian government announced it would repeal the three farm laws after a year of protest.",
    wiki: "2020–2021 Indian farmers' protest",
    tags: ["punjab"],
  },
  {
    id: "hardeep-singh-nijjar",
    date: "2023-06-18",
    title: "Bhai Hardeep Singh Nijjar is killed in Surrey",
    summary:
      "The president of Guru Nanak Sikh Gurdwara in Surrey, British Columbia, was shot dead in its car park. Canada later said it had credible allegations linking agents of the Indian government to the killing.",
    wiki: "Killing of Hardeep Singh Nijjar",
    tags: ["diaspora", "shaheedi"],
  },
];

export interface DatedHistoryEvent extends HistoryEvent {
  /** Whole years since the event, on this year's anniversary. */
  yearsAgo: number;
  /** Days from the given date to this year's anniversary (negative: already passed). */
  daysAway: number;
}

const DAY = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/**
 * Events whose anniversary falls within `before` days before and `after` days
 * after `today` (YYYY-MM-DD), nearest first. Handles the turn of the year.
 */
export function eventsAround(today: string, before = 7, after = 7, events = HISTORY_EVENTS): DatedHistoryEvent[] {
  const now = utcDay(today);
  const year = Number(today.slice(0, 4));
  const out: DatedHistoryEvent[] = [];
  for (const event of events) {
    const monthDay = event.date.slice(5);
    for (const y of [year - 1, year, year + 1]) {
      // 29 February anniversaries fall on 1 March in other years.
      const anniversary = utcDay(`${y}-${monthDay}`);
      const daysAway = Math.round((anniversary - now) / DAY);
      if (daysAway >= -before && daysAway <= after) {
        out.push({ ...event, daysAway, yearsAgo: y - Number(event.date.slice(0, 4)) });
      }
    }
  }
  return out.sort((a, b) => a.daysAway - b.daysAway || a.date.localeCompare(b.date));
}

export function wikipediaUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}
