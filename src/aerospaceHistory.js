/**
 * Aerospace History Events Database
 * Contains important aerospace milestones from both Chinese and Western space programs
 */

export const aerospaceHistoryEvents = [
    // ==================== 中国航天事件 ====================
    {
        id: 'cn-001',
        date: '1970-04-24',
        year: 1970,
        country: '中国',
        title: '东方红一号卫星发射',
        titleEN: 'Dongfanghong-1 Satellite Launch',
        description: '中国第一颗人造地球卫星发射成功,使中国成为第五个独立发射卫星的国家',
        descriptionEN: 'China\'s first artificial Earth satellite launched successfully, making China the 5th country to independently launch a satellite',
        category: '卫星',
        significance: 'high'
    },
    {
        id: 'cn-002',
        date: '2003-10-15',
        year: 2003,
        country: '中国',
        title: '神舟五号载人航天',
        titleEN: 'Shenzhou-5 Manned Spaceflight',
        description: '杨利伟乘坐神舟五号飞船进入太空,中国成为第三个独立将人类送入太空的国家',
        descriptionEN: 'Yang Liwei aboard Shenzhou-5 entered space, making China the 3rd country to independently send humans to space',
        category: '载人航天',
        significance: 'high'
    },
    {
        id: 'cn-003',
        date: '2007-10-24',
        year: 2007,
        country: '中国',
        title: '嫦娥一号月球探测',
        titleEN: 'Chang\'e-1 Lunar Exploration',
        description: '中国首个月球探测器发射成功,开始绕月探测',
        descriptionEN: 'China\'s first lunar probe launched successfully, beginning lunar orbital exploration',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'cn-004',
        date: '2011-09-29',
        year: 2011,
        country: '中国',
        title: '天宫一号空间实验室',
        titleEN: 'Tiangong-1 Space Laboratory',
        description: '中国首个空间实验室发射成功,为空间站建设奠定基础',
        descriptionEN: 'China\'s first space laboratory launched successfully, laying foundation for space station construction',
        category: '空间站',
        significance: 'medium'
    },
    {
        id: 'cn-005',
        date: '2013-12-14',
        year: 2013,
        country: '中国',
        title: '嫦娥三号月面软着陆',
        titleEN: 'Chang\'e-3 Lunar Soft Landing',
        description: '嫦娥三号成功在月球虹湾地区软着陆,玉兔号月球车开始巡视探测',
        descriptionEN: 'Chang\'e-3 successfully soft-landed in Mare Imbrium, Yutu rover began surface exploration',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'cn-006',
        date: '2016-09-15',
        year: 2016,
        country: '中国',
        title: '天宫二号空间实验室',
        titleEN: 'Tiangong-2 Space Laboratory',
        description: '天宫二号发射成功,开展多项空间科学实验和技术试验',
        descriptionEN: 'Tiangong-2 launched successfully, conducting multiple space science experiments and technology tests',
        category: '空间站',
        significance: 'medium'
    },
    {
        id: 'cn-007',
        date: '2019-01-03',
        year: 2019,
        country: '中国',
        title: '嫦娥四号月背着陆',
        titleEN: 'Chang\'e-4 Far Side Landing',
        description: '人类探测器首次在月球背面软着陆,玉兔二号开始巡视探测',
        descriptionEN: 'First human probe to soft-land on lunar far side, Yutu-2 began exploration',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'cn-008',
        date: '2020-11-24',
        year: 2020,
        country: '中国',
        title: '嫦娥五号月球采样返回',
        titleEN: 'Chang\'e-5 Lunar Sample Return',
        description: '成功从月球采集约1731克月壤样本并返回地球',
        descriptionEN: 'Successfully collected approximately 1731g of lunar soil samples and returned to Earth',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'cn-009',
        date: '2021-04-29',
        year: 2021,
        country: '中国',
        title: '天和核心舱发射',
        titleEN: 'Tianhe Core Module Launch',
        description: '中国空间站天和核心舱发射成功,标志着中国空间站建设正式启动',
        descriptionEN: 'Tianhe core module launched successfully, marking the official start of Chinese space station construction',
        category: '空间站',
        significance: 'high'
    },
    {
        id: 'cn-010',
        date: '2021-05-15',
        year: 2021,
        country: '中国',
        title: '天问一号火星着陆',
        titleEN: 'Tianwen-1 Mars Landing',
        description: '天问一号探测器成功着陆火星乌托邦平原,祝融号火星车开始巡视',
        descriptionEN: 'Tianwen-1 probe successfully landed in Utopia Planitia on Mars, Zhurong rover began exploration',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'cn-011',
        date: '2022-11-29',
        year: 2022,
        country: '中国',
        title: '神舟十五号乘组进驻空间站',
        titleEN: 'Shenzhou-15 Crew Enters Space Station',
        description: '中国空间站完成"T"字基本构型建造,进入应用与发展阶段',
        descriptionEN: 'Chinese space station completed basic "T" configuration, entered application and development phase',
        category: '空间站',
        significance: 'high'
    },
    {
        id: 'cn-012',
        date: '2024-06-25',
        year: 2024,
        country: '中国',
        title: '嫦娥六号月背采样返回',
        titleEN: 'Chang\'e-6 Far Side Sample Return',
        description: '人类首次从月球背面采集样本并成功返回地球',
        descriptionEN: 'First time in human history to collect samples from lunar far side and return to Earth',
        category: '深空探测',
        significance: 'high'
    },

    // ==================== 西方航天事件 ====================
    {
        id: 'us-001',
        date: '1957-10-04',
        year: 1957,
        country: '苏联',
        title: '斯普特尼克1号',
        titleEN: 'Sputnik 1',
        description: '人类第一颗人造卫星发射成功,开启太空时代',
        descriptionEN: 'First artificial satellite launched successfully, beginning the Space Age',
        category: '卫星',
        significance: 'high'
    },
    {
        id: 'us-002',
        date: '1961-04-12',
        year: 1961,
        country: '苏联',
        title: '加加林首次载人航天',
        titleEN: 'Gagarin First Human Spaceflight',
        description: '尤里·加加林成为第一个进入太空的人类',
        descriptionEN: 'Yuri Gagarin became the first human to enter space',
        category: '载人航天',
        significance: 'high'
    },
    {
        id: 'us-003',
        date: '1965-03-18',
        year: 1965,
        country: '苏联',
        title: '首次太空行走',
        titleEN: 'First Spacewalk',
        description: '阿列克谢·列昂诺夫完成人类首次太空行走',
        descriptionEN: 'Alexei Leonov completed the first human spacewalk',
        category: '载人航天',
        significance: 'high'
    },
    {
        id: 'us-004',
        date: '1961-05-05',
        year: 1961,
        country: '美国',
        title: '美国首次载人航天',
        titleEN: 'First US Manned Spaceflight',
        description: '艾伦·谢泼德乘坐自由7号完成亚轨道飞行',
        descriptionEN: 'Alan Shepard completed suborbital flight aboard Freedom 7',
        category: '载人航天',
        significance: 'medium'
    },
    {
        id: 'us-005',
        date: '1962-02-20',
        year: 1962,
        country: '美国',
        title: '格伦首次美国轨道飞行',
        titleEN: 'Glenn First US Orbital Flight',
        description: '约翰·格伦乘坐友谊7号成为第一个绕地球轨道飞行的美国人',
        descriptionEN: 'John Glenn aboard Friendship 7 became first American to orbit Earth',
        category: '载人航天',
        significance: 'high'
    },
    {
        id: 'us-006',
        date: '1965-12-15',
        year: 1965,
        country: '美国',
        title: '双子座6号和7号交会对接',
        titleEN: 'Gemini 6A & 7 Rendezvous',
        description: '人类首次在太空实现两艘飞船的交会',
        descriptionEN: 'First time two spacecraft rendezvoused in space',
        category: '载人航天',
        significance: 'high'
    },
    {
        id: 'us-007',
        date: '1969-07-20',
        year: 1969,
        country: '美国',
        title: '阿波罗11号登月',
        titleEN: 'Apollo 11 Moon Landing',
        description: '尼尔·阿姆斯特朗和巴兹·奥尔德林成为首批登上月球的人类',
        descriptionEN: 'Neil Armstrong and Buzz Aldrin became first humans to walk on the Moon',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'us-008',
        date: '1971-04-19',
        year: 1971,
        country: '苏联',
        title: '礼炮1号空间站',
        titleEN: 'Salyut 1 Space Station',
        description: '人类第一个空间站发射成功',
        descriptionEN: 'First space station launched successfully',
        category: '空间站',
        significance: 'high'
    },
    {
        id: 'us-009',
        date: '1973-05-14',
        year: 1973,
        country: '美国',
        title: '天空实验室',
        titleEN: 'Skylab',
        description: '美国第一个空间站发射成功,开展了大量科学实验',
        descriptionEN: 'America\'s first space station launched, conducted extensive scientific experiments',
        category: '空间站',
        significance: 'medium'
    },
    {
        id: 'us-010',
        date: '1981-04-12',
        year: 1981,
        country: '美国',
        title: '航天飞机首次飞行',
        titleEN: 'First Space Shuttle Flight',
        description: '哥伦比亚号航天飞机执行STS-1任务,开启可重复使用航天器时代',
        descriptionEN: 'Space Shuttle Columbia executed STS-1 mission, beginning era of reusable spacecraft',
        category: '航天器',
        significance: 'high'
    },
    {
        id: 'us-011',
        date: '1986-01-28',
        year: 1986,
        country: '美国',
        title: '挑战者号事故',
        titleEN: 'Challenger Disaster',
        description: '挑战者号航天飞机在发射后73秒爆炸,7名宇航员遇难',
        descriptionEN: 'Space Shuttle Challenger exploded 73 seconds after launch, 7 astronauts lost',
        category: '事故',
        significance: 'high'
    },
    {
        id: 'us-012',
        date: '1990-04-24',
        year: 1990,
        country: '美国',
        title: '哈勃太空望远镜发射',
        titleEN: 'Hubble Space Telescope Launch',
        description: '哈勃太空望远镜由发现号航天飞机部署,彻底改变了天文学',
        descriptionEN: 'Hubble Space Telescope deployed by Discovery shuttle, revolutionized astronomy',
        category: '天文观测',
        significance: 'high'
    },
    {
        id: 'us-013',
        date: '1998-11-20',
        year: 1998,
        country: '国际',
        title: '国际空间站首个组件',
        titleEN: 'ISS First Module',
        description: '曙光号功能货舱发射,国际空间站建设开始',
        descriptionEN: 'Zarya module launched, beginning of International Space Station construction',
        category: '空间站',
        significance: 'high'
    },
    {
        id: 'us-014',
        date: '2006-01-19',
        year: 2006,
        country: '美国',
        title: '新视野号发射',
        titleEN: 'New Horizons Launch',
        description: '新视野号探测器发射前往冥王星,2015年飞掠冥王星',
        descriptionEN: 'New Horizons probe launched to Pluto, flew by Pluto in 2015',
        category: '深空探测',
        significance: 'medium'
    },
    {
        id: 'us-015',
        date: '2011-07-08',
        year: 2011,
        country: '美国',
        title: '亚特兰蒂斯号最后一次任务',
        titleEN: 'Atlantis Final Mission',
        description: '亚特兰蒂斯号执行STS-135任务,航天飞机计划结束',
        descriptionEN: 'Atlantis executed STS-135 mission, end of Space Shuttle program',
        category: '航天器',
        significance: 'medium'
    },
    {
        id: 'us-016',
        date: '2012-08-06',
        year: 2012,
        country: '美国',
        title: '好奇号火星着陆',
        titleEN: 'Curiosity Mars Landing',
        description: '好奇号火星车成功着陆火星盖尔撞击坑',
        descriptionEN: 'Curiosity rover successfully landed in Gale Crater on Mars',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'us-017',
        date: '2021-02-18',
        year: 2021,
        country: '美国',
        title: '毅力号火星着陆',
        titleEN: 'Perseverance Mars Landing',
        description: '毅力号火星车携带机智号直升机着陆火星耶泽罗撞击坑',
        descriptionEN: 'Perseverance rover with Ingenuity helicopter landed in Jezero Crater on Mars',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'us-018',
        date: '2022-12-11',
        year: 2022,
        country: '美国',
        title: '阿耳忒弥斯1号任务',
        titleEN: 'Artemis 1 Mission',
        description: '猎户座飞船完成无人绕月飞行,为载人登月做准备',
        descriptionEN: 'Orion spacecraft completed uncrewed lunar orbit flight, preparing for crewed Moon missions',
        category: '深空探测',
        significance: 'high'
    },
    {
        id: 'us-019',
        date: '2023-04-14',
        year: 2023,
        country: '欧洲',
        title: '木星冰卫星探测器发射',
        titleEN: 'JUICE Mission Launch',
        description: '欧空局木星冰卫星探测器发射,将探测木卫二、木卫三和木卫四',
        descriptionEN: 'ESA Jupiter Icy Moons Explorer launched, will explore Europa, Ganymede, and Callisto',
        category: '深空探测',
        significance: 'medium'
    }
]

/**
 * Get events by category
 */
export function getEventsByCategory(category) {
    return aerospaceHistoryEvents.filter(event => event.category === category)
}

/**
 * Get events by country
 */
export function getEventsByCountry(country) {
    return aerospaceHistoryEvents.filter(event => event.country === country)
}

/**
 * Get events by year range
 */
export function getEventsByYearRange(startYear, endYear) {
    return aerospaceHistoryEvents.filter(event => 
        event.year >= startYear && event.year <= endYear
    )
}

/**
 * Get high significance events
 */
export function getHighSignificanceEvents() {
    return aerospaceHistoryEvents.filter(event => event.significance === 'high')
}

/**
 * Get events count by category
 */
export function getEventsByCategoryCount() {
    const counts = {}
    aerospaceHistoryEvents.forEach(event => {
        counts[event.category] = (counts[event.category] || 0) + 1
    })
    return counts
}

/**
 * Get timeline data grouped by decade
 */
export function getTimelineByDecade() {
    const decades = {}
    aerospaceHistoryEvents.forEach(event => {
        const decade = Math.floor(event.year / 10) * 10
        if (!decades[decade]) {
            decades[decade] = []
        }
        decades[decade].push(event)
    })
    return decades
}
